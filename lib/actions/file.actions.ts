"use server";

import { createAdminClient } from "@/lib/appwrite";
import { InputFile } from "node-appwrite/file";
import { appwriteConfig } from "@/lib/appwrite/config";
import { ID, Models, Query } from "node-appwrite";
import { constructFileUrl, getFileType, parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { MAX_FILE_SIZE, sortTypes } from "@/constants";
import { z } from "zod";
import { prepareShareNotifications } from "@/lib/notifications";

const requireUser = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error("User is not authenticated.");
  return user;
};

const getOwnedFile = async (fileId: string) => {
  const user = await requireUser();
  const { tablesDB } = await createAdminClient();
  const file = await tablesDB.getRow({
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.filesTableId,
    rowId: fileId,
    queries: [Query.select(["*", "owner.*"])],
  });
  const ownerId = typeof file.owner === "string" ? file.owner : file.owner?.$id;
  if (ownerId !== user.$id) throw new Error("You do not own this file.");
  return file;
};

// Appwrite defaults to 25 rows. Walk every page for listings and usage totals.
const listAllFiles = async (queries: string[]) => {
  const { tablesDB } = await createAdminClient();
  type FileRow = Models.Row & Pick<AppwriteFile, "type" | "size">;
  const rows: FileRow[] = [];
  let cursor: string | undefined;
  let page;
  do {
    page = await tablesDB.listRows<FileRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      queries: [
        ...queries,
        Query.limit(100),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    });
    rows.push(...page.rows);
    cursor = page.rows.at(-1)?.$id;
  } while (page.rows.length === 100);
  return { total: rows.length, rows };
};

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export const uploadFile = async ({ file, path }: UploadFileProps) => {
  const currentUser = await requireUser();
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_FILE_SIZE) {
    throw new Error("Choose a non-empty file up to 4 MB.");
  }
  const { storage, tablesDB } = await createAdminClient();

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    // Appwrite Cloud's CDN (Varnish) intermittently returns a "503 backend
    // write error" on larger uploads such as videos. Retry the storage write a
    // few times with backoff before giving up. A fresh InputFile is built per
    // attempt so the buffer is re-read cleanly on retry.
    let bucketFile: Models.File | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        bucketFile = await storage.createFile({
          bucketId: appwriteConfig.bucketId,
          fileId: ID.unique(),
          file: InputFile.fromBuffer(buffer, file.name),
        });
        break;
      } catch (error) {
        const code = (error as { code?: number }).code;
        if (code !== 503 || attempt === 3) throw error;
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }

    if (!bucketFile) throw new Error("Failed to upload file to storage");

    const fileDocument = {
      type: getFileType(bucketFile.name).type,
      name: bucketFile.name,
      url: constructFileUrl(bucketFile.$id),
      extension: getFileType(bucketFile.name).extension,
      size: bucketFile.sizeOriginal,
      owner: currentUser.$id,
      accountId: currentUser.accountId,
      users: [],
      bucketFileId: bucketFile.$id,
    };

    const newFile = await tablesDB
      .createRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.filesTableId,
        rowId: ID.unique(),
        data: fileDocument,
      })
      .catch(async (error: unknown) => {
        await storage.deleteFile({
          bucketId: appwriteConfig.bucketId,
          fileId: bucketFile.$id,
        });
        handleError(error, "Failed to create file document");
      });

    revalidatePath("/", "layout");
    return parseStringify(newFile);
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

const createQueries = (
  currentUser: Models.Document & { email: string },
  types: string[],
  searchText: string,
  sort: string,
  limit?: number,
  scope: FileScope = "all",
) => {
  const accessQuery =
    scope === "owned"
      ? Query.equal("owner", [currentUser.$id])
      : scope === "shared"
        ? Query.and([
            Query.contains("users", [currentUser.email]),
            Query.notEqual("owner", [currentUser.$id]),
          ])
        : Query.or([
            Query.equal("owner", [currentUser.$id]),
            Query.contains("users", [currentUser.email]),
          ]);
  const queries = [
    accessQuery,
    // TablesDB returns relationship columns as bare IDs by default; select
    // nested owner fields so `file.owner` comes back as the populated user row.
    Query.select(["*", "owner.*"]),
  ];

  if (types.length > 0) queries.push(Query.equal("type", types));
  if (searchText) queries.push(Query.contains("name", searchText));
  if (limit) queries.push(Query.limit(limit));

  if (sort) {
    if (!sortTypes.some((option) => option.value === sort)) {
      throw new Error("Invalid sort order.");
    }
    const [sortBy, orderBy] = sort.split("-");
    queries.push(
      orderBy === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    );
  }

  return queries;
};

export const getFiles = async ({
  types = [],
  searchText = "",
  sort = "$createdAt-desc",
  limit,
  scope = "all",
}: GetFilesProps = {}) => {
  const { tablesDB } = await createAdminClient();

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) throw new Error("User not found");

    z.enum(["all", "owned", "shared"]).parse(scope);
    const queries = createQueries(
      currentUser,
      types,
      searchText,
      sort,
      limit,
      scope,
    );

    if (!limit) return parseStringify(await listAllFiles(queries));

    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      queries,
    });

    return parseStringify(files);
  } catch (error) {
    handleError(error, "Failed to get files");
  }
};

export const renameFile = async ({ fileId, name, path }: RenameFileProps) => {
  const file = await getOwnedFile(fileId);
  const { tablesDB } = await createAdminClient();

  try {
    const requestedName = z.string().trim().min(1).max(255).parse(name);
    const suffix = file.extension ? `.${file.extension}` : "";
    const newName =
      suffix && !requestedName.toLowerCase().endsWith(suffix.toLowerCase())
        ? `${requestedName}${suffix}`
        : requestedName;
    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      rowId: fileId,
      data: { name: newName },
    });

    revalidatePath("/", "layout");
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to rename file");
  }
};

export const updateFileUsers = async ({
  fileId,
  emails,
  path,
}: UpdateFileUsersProps) => {
  const file = await getOwnedFile(fileId);
  const normalizedEmails = [
    ...new Set(
      emails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  z.array(z.email()).max(100).parse(normalizedEmails);
  const { tablesDB } = await createAdminClient();

  try {
    await prepareShareNotifications(file, normalizedEmails);
    const updatedFile = await tablesDB.updateRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      rowId: fileId,
      data: { users: normalizedEmails },
    });

    revalidatePath("/", "layout");
    return parseStringify(updatedFile);
  } catch (error) {
    handleError(error, "Failed to update file users");
  }
};

export const deleteFile = async ({ fileId, path }: DeleteFileProps) => {
  const file = await getOwnedFile(fileId);
  const { storage, tablesDB } = await createAdminClient();

  try {
    // Keep metadata when a storage deletion fails so the user can retry.
    try {
      await storage.deleteFile({
        bucketId: appwriteConfig.bucketId,
        fileId: file.bucketFileId,
      });
    } catch (error) {
      if ((error as { code?: number }).code !== 404) throw error;
    }
    await tablesDB.deleteRow({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      rowId: fileId,
    });

    revalidatePath("/", "layout");
    return parseStringify({ status: "success" });
  } catch (error) {
    handleError(error, "Failed to delete file");
  }
};

export async function getTotalSpaceUsed() {
  try {
    const currentUser = await requireUser();

    const files = await listAllFiles([
      Query.equal("owner", [currentUser.$id]),
      Query.orderAsc("$id"),
      Query.select(["$id", "type", "size", "$updatedAt"]),
    ]);

    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 2 * 1024 * 1024 * 1024,
    };

    files.rows.forEach((file) => {
      const fileType = file.type as FileType;
      totalSpace[fileType].size += file.size;
      totalSpace.used += file.size;
      if (
        !totalSpace[fileType].latestDate ||
        new Date(file.$updatedAt) > new Date(totalSpace[fileType].latestDate)
      ) {
        totalSpace[fileType].latestDate = file.$updatedAt;
      }
    });

    return parseStringify(totalSpace);
  } catch (error) {
    handleError(error, "Error calculating total space used");
  }
}

export async function getFileSearchIndex(): Promise<FileSearchEntry[]> {
  const user = await requireUser();
  const files = await listAllFiles([
    Query.or([
      Query.equal("owner", [user.$id]),
      Query.contains("users", [user.email]),
    ]),
    Query.orderAsc("$id"),
    Query.select([
      "$id",
      "name",
      "type",
      "extension",
      "bucketFileId",
      "$createdAt",
    ]),
  ]);
  return files.rows.map((row) => {
    const file = row as unknown as AppwriteFile;
    return {
      $id: file.$id,
      name: file.name,
      type: file.type,
      extension: file.extension,
      url: constructFileUrl(file.bucketFileId),
      $createdAt: file.$createdAt,
    };
  });
}
