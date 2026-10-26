import Card from "@/components/Card";
import Sort from "@/components/Sort";
import FileScopeFilter from "@/components/FileScopeFilter";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams, convertFileSize } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { sortTypes } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";

const Page = async ({ params, searchParams }: SearchParamProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  const type = ((await params)?.type as string) || "";
  if (!["documents", "images", "media", "others", "shared"].includes(type))
    notFound();
  const queryParams = await searchParams;
  const searchText =
    typeof queryParams?.query === "string" ? queryParams.query : "";
  const sort =
    sortTypes.find((option) => option.value === queryParams?.sort)?.value ||
    sortTypes[0].value;

  const isSharedPage = type === "shared";
  const scope: FileScope = isSharedPage
    ? "shared"
    : queryParams?.scope === "owned" || queryParams?.scope === "shared"
      ? queryParams.scope
      : "all";
  const types = isSharedPage ? [] : (getFileTypesParams(type) as FileType[]);
  const files = await getFiles({ types, searchText, sort, scope });

  const totalSize = files?.rows?.reduce(
    (acc: number, file: AppwriteFile) => acc + file.size,
    0,
  );

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">
          {isSharedPage ? "Shared files" : type}
        </h1>

        <div className="mt-3 flex flex-col gap-4">
          <p className="body-1">
            Total: <span className="h5">{convertFileSize(totalSize ?? 0)}</span>
          </p>

          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {!isSharedPage && <FileScopeFilter />}
            <Sort />
          </div>
        </div>
      </section>

      {files?.total > 0 ? (
        <section className="file-list">
          {files.rows.map((file: AppwriteFile) => (
            <Card key={file.$id} file={file} currentUserId={currentUser.$id} />
          ))}
        </section>
      ) : (
        <p className="empty-list">
          {searchText
            ? "No files match your search"
            : scope === "shared"
              ? "No files shared with you"
              : "No files uploaded"}
        </p>
      )}
    </div>
  );
};

export default Page;
