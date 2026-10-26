import Thumbnail from "@/components/Thumbnail";
import { convertFileSize } from "@/lib/utils";
import FormattedDateTime from "@/components/FormattedDateTime";
import ActionDropdown from "@/components/ActionDropdown";

const Card = ({
  file,
  currentUserId,
}: {
  file: AppwriteFile;
  currentUserId: string;
}) => {
  return (
    <article className="file-card">
      <div className="flex justify-between">
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${file.name}`}
        >
          <Thumbnail
            type={file.type}
            extension={file.extension}
            url={file.url}
            className="size-20!"
            imageClassName="size-11!"
          />
        </a>

        <div className="flex flex-col items-end justify-between">
          <ActionDropdown
            file={file}
            canManage={file.owner.$id === currentUserId}
          />
          <p className="body-1">{convertFileSize(file.size)}</p>
        </div>
      </div>

      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="file-card-details"
      >
        <p className="subtitle-2 line-clamp-1">{file.name}</p>

        <FormattedDateTime
          date={file.$createdAt}
          className="body-2 text-light-100"
        />
        <p className="caption line-clamp-1 text-light-200">
          {file.owner.$id === currentUserId ? "By" : "Shared by"}:{" "}
          {file.owner.fullName}
        </p>
      </a>
    </article>
  );
};

export default Card;
