import Card from "@/components/Card";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams, convertFileSize } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { sortTypes } from "@/constants";
import { getCurrentUser } from "@/lib/actions/user.actions";

const Page = async ({ params, searchParams }: SearchParamProps) => {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/sign-in");
  const type = ((await params)?.type as string) || "";
  if (!["documents", "images", "media", "others"].includes(type)) notFound();
  const queryParams = await searchParams;
  const searchText =
    typeof queryParams?.query === "string" ? queryParams.query : "";
  const sort =
    sortTypes.find((option) => option.value === queryParams?.sort)?.value ||
    sortTypes[0].value;

  const types = getFileTypesParams(type) as FileType[];
  const files = await getFiles({ types, searchText, sort });

  const totalSize = files?.rows?.reduce(
    (acc: number, file: AppwriteFile) => acc + file.size,
    0,
  );

  return (
    <div className="page-container">
      <section className="w-full">
        <h1 className="h1 capitalize">{type}</h1>

        <div className="total-size-section">
          <p className="body-1">
            Total: <span className="h5">{convertFileSize(totalSize ?? 0)}</span>
          </p>

          <div className="sort-container">
            <p className="hidden body-1 text-light-200 sm:block">Sort by:</p>

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
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};

export default Page;
