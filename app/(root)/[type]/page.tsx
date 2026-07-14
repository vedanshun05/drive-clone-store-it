import Card from "@/components/Card";
import Sort from "@/components/Sort";
import { getFiles } from "@/lib/actions/file.actions";
import { getFileTypesParams, convertFileSize } from "@/lib/utils";

const Page = async ({ params, searchParams }: SearchParamProps) => {
  const type = ((await params)?.type as string) || "";
  const searchText = ((await searchParams)?.query as string) || "";
  const sort = ((await searchParams)?.sort as string) || "";

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
            <Card key={file.$id} file={file} />
          ))}
        </section>
      ) : (
        <p className="empty-list">No files uploaded</p>
      )}
    </div>
  );
};

export default Page;
