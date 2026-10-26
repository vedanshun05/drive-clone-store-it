import { pathToFileURL } from "node:url";
import {
  Client,
  TablesDB,
  Storage,
  Query,
  RelationshipType,
  RelationMutate,
  TablesDBIndexType,
} from "node-appwrite";

export const runtimeScopes = [
  "sessions.write",
  "rows.read",
  "rows.write",
  "files.read",
  "files.write",
];
export const setupScopes = [
  ...runtimeScopes,
  ...["databases", "tables", "columns", "indexes", "buckets"].flatMap(
    (name) => [`${name}.read`, `${name}.write`],
  ),
];

export function readConfig(env = process.env) {
  const required = (name) => {
    if (!env[name]) throw new Error(`Missing ${name} in .env.local`);
    return env[name];
  };
  return {
    endpoint: required("NEXT_PUBLIC_APPWRITE_ENDPOINT"),
    projectId: required("NEXT_PUBLIC_APPWRITE_PROJECT_ID"),
    key: env.APPWRITE_SETUP_KEY || required("NEXT_APPWRITE_SECRET_KEY"),
    databaseId: required("NEXT_PUBLIC_APPWRITE_DATABASE_ID"),
    usersTableId: required("NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID"),
    filesTableId: required("NEXT_PUBLIC_APPWRITE_FILES_TABLE_ID"),
    notificationsTableId:
      env.NEXT_PUBLIC_APPWRITE_NOTIFICATIONS_TABLE_ID || "notifications",
    bucketId: required("NEXT_PUBLIC_APPWRITE_BUCKET_ID"),
  };
}

export async function waitForReady(
  read,
  label,
  { timeout = 120_000, interval = 1000 } = {},
) {
  const deadline = Date.now() + timeout;
  while (true) {
    const resource = await read();
    if (resource.status === "available") return resource;
    if (["failed", "stuck"].includes(resource.status)) {
      throw new Error(`${label}: ${resource.error || resource.status}`);
    }
    if (Date.now() >= deadline)
      throw new Error(`Timed out waiting for ${label}; rerun setup to resume.`);
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

export async function provision(
  config,
  { apply = false, log = console.log, tablesDB, storage } = {},
) {
  if (!tablesDB || !storage) {
    const client = new Client()
      .setEndpoint(config.endpoint)
      .setProject(config.projectId)
      .setKey(config.key);
    tablesDB = new TablesDB(client);
    storage = new Storage(client);
  }
  const ensure = async (label, read, create) => {
    try {
      return await read();
    } catch (error) {
      if (error.code !== 404) throw error;
      if (!apply)
        throw new Error(
          `${label} is missing. Run npm run backend:setup -- --apply.`,
        );
      const resource = await create();
      log(`Created ${label}`);
      return resource;
    }
  };
  const databaseId = config.databaseId;
  const notificationsTableId = config.notificationsTableId || "notifications";
  await ensure(
    "database",
    () => tablesDB.get({ databaseId }),
    () => tablesDB.create({ databaseId, name: "StoreIt", enabled: true }),
  );
  for (const [tableId, name] of [
    [config.usersTableId, "Users"],
    [config.filesTableId, "Files"],
    [notificationsTableId, "Notifications"],
  ]) {
    const params = { databaseId, tableId };
    const table = await ensure(
      `table ${tableId}`,
      () => tablesDB.getTable(params),
      () =>
        tablesDB.createTable({
          ...params,
          name,
          permissions: [],
          rowSecurity: true,
          enabled: true,
        }),
    );
    if (table.$permissions.length || !table.rowSecurity || !table.enabled) {
      throw new Error(
        `Table ${tableId} must be enabled with row security and no client permissions. Existing permissions were not changed.`,
      );
    }
  }
  const varchar = (key, size, required = true) => ({
    method: "createVarcharColumn",
    params: { key, size, required },
  });
  const userColumns = [
    varchar("fullName", 50),
    { method: "createEmailColumn", params: { key: "email", required: true } },
    varchar("avatar", 2048),
    varchar("accountId", 36),
  ];
  const fileColumns = [
    {
      method: "createEnumColumn",
      params: {
        key: "type",
        elements: ["document", "image", "video", "audio", "other"],
        required: true,
      },
    },
    varchar("name", 255),
    varchar("url", 2048),
    varchar("extension", 255, false),
    {
      method: "createIntegerColumn",
      params: { key: "size", min: 0, max: 4 * 1024 * 1024, required: true },
    },
    varchar("accountId", 36),
    varchar("bucketFileId", 36),
    {
      method: "createEmailColumn",
      params: { key: "users", required: false, array: true },
    },
    {
      method: "createRelationshipColumn",
      params: {
        key: "owner",
        relatedTableId: config.usersTableId,
        type: RelationshipType.ManyToOne,
        twoWay: false,
        onDelete: RelationMutate.Restrict,
      },
    },
  ];
  const notificationColumns = [
    {
      method: "createEmailColumn",
      params: { key: "recipient", required: true },
    },
    varchar("fileId", 36),
    { method: "createBooleanColumn", params: { key: "read", required: true } },
    {
      method: "createDatetimeColumn",
      params: { key: "eventAt", required: true },
    },
  ];
  for (const [tableId, columns] of [
    [config.usersTableId, userColumns],
    [config.filesTableId, fileColumns],
    [notificationsTableId, notificationColumns],
  ]) {
    for (const { method, params } of columns) {
      const address = { databaseId, tableId, key: params.key };
      const label = `${tableId}.${params.key}`;
      await ensure(
        label,
        () => tablesDB.getColumn(address),
        () => tablesDB[method]({ databaseId, tableId, ...params }),
      );
      const column = await waitForReady(
        () => tablesDB.getColumn(address),
        label,
      );
      for (const property of ["required", "array", "size", "twoWay"]) {
        if (
          params[property] !== undefined &&
          column[property] !== params[property]
        ) {
          throw new Error(
            `${label} has an unexpected ${property}; existing schema was not changed.`,
          );
        }
      }
      if (
        method === "createRelationshipColumn" &&
        (column.relatedTable !== params.relatedTableId ||
          column.relationType !== params.type ||
          column.onDelete !== params.onDelete)
      ) {
        throw new Error(
          `${label} points to an unexpected relationship; existing schema was not changed.`,
        );
      }
      log(`Ready ${label}`);
    }
  }
  const indexes = [
    [
      notificationsTableId,
      "recipient_filter",
      TablesDBIndexType.Key,
      ["recipient"],
    ],
    [notificationsTableId, "event_sort", TablesDBIndexType.Key, ["eventAt"]],
    [config.usersTableId, "email_unique", TablesDBIndexType.Unique, ["email"]],
    [
      config.usersTableId,
      "account_unique",
      TablesDBIndexType.Unique,
      ["accountId"],
    ],
    [
      config.filesTableId,
      "bucket_file_unique",
      TablesDBIndexType.Unique,
      ["bucketFileId"],
    ],
    [config.filesTableId, "type_filter", TablesDBIndexType.Key, ["type"]],
    // Appwrite currently rejects indexes on array columns such as shared emails.
    [config.filesTableId, "name_sort", TablesDBIndexType.Key, ["name"]],
    [config.filesTableId, "size_sort", TablesDBIndexType.Key, ["size"]],
  ];
  for (const [tableId, key, type, columns] of indexes) {
    const address = { databaseId, tableId, key };
    await ensure(
      `index ${tableId}.${key}`,
      () => tablesDB.getIndex(address),
      () => tablesDB.createIndex({ ...address, type, columns }),
    );
    const index = await waitForReady(
      () => tablesDB.getIndex(address),
      `${tableId}.${key}`,
    );
    if (
      index.type !== type ||
      JSON.stringify(index.columns) !== JSON.stringify(columns)
    ) {
      throw new Error(
        `Index ${tableId}.${key} does not match the expected schema.`,
      );
    }
    log(`Ready index ${tableId}.${key}`);
  }
  const bucketId = config.bucketId;
  const bucket = await ensure(
    "private storage bucket",
    () => storage.getBucket({ bucketId }),
    () =>
      storage.createBucket({
        bucketId,
        name: "StoreIt files",
        permissions: [],
        fileSecurity: true,
        enabled: true,
        maximumFileSize: 4 * 1024 * 1024,
        encryption: true,
        antivirus: true,
      }),
  );
  if (
    bucket.$permissions.length ||
    !bucket.fileSecurity ||
    !bucket.enabled ||
    bucket.maximumFileSize !== 4 * 1024 * 1024
  ) {
    throw new Error(
      "Bucket must be private, enabled, and limited to 4 MiB; existing settings were not changed.",
    );
  }
  // Validate the real app's query shapes without creating accounts or files.
  for (const sort of ["$createdAt", "name", "size"]) {
    await tablesDB.listRows({
      databaseId,
      tableId: config.filesTableId,
      queries: [
        Query.or([
          Query.equal("owner", ["setup_probe"]),
          Query.contains("users", ["setup-probe@example.invalid"]),
        ]),
        Query.equal("type", ["document"]),
        Query.contains("name", "setup-probe"),
        Query.select(["*", "owner.*"]),
        Query.orderDesc(sort),
        Query.limit(1),
      ],
    });
  }
  await tablesDB.listRows({
    databaseId,
    tableId: config.filesTableId,
    queries: [
      Query.and([
        Query.contains("users", ["setup-probe@example.invalid"]),
        Query.notEqual("owner", ["setup_probe"]),
      ]),
      Query.select(["*", "owner.*"]),
      Query.limit(1),
    ],
  });
  await tablesDB.listRows({
    databaseId,
    tableId: notificationsTableId,
    queries: [
      Query.equal("recipient", "setup-probe@example.invalid"),
      Query.orderDesc("eventAt"),
      Query.limit(1),
    ],
  });
  log(
    `Verified StoreIt backend in project ${config.projectId}. No accounts or files were created.`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv.includes("--scopes")) {
    console.log(`Setup scopes: ${setupScopes.join(", ")}`);
    console.log(`Runtime scopes: ${runtimeScopes.join(", ")}`);
  } else {
    provision(readConfig(), { apply: process.argv.includes("--apply") }).catch(
      (error) => {
        console.error(
          `Backend setup failed: ${error.message} (${error.type || error.code || "configuration"})`,
        );
        process.exitCode = 1;
      },
    );
  }
}
