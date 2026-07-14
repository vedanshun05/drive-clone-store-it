import Image from "next/image";
import { cn, getFileIcon } from "@/lib/utils";

interface Props {
  type: string;
  extension: string;
  url?: string;
  imageClassName?: string;
  className?: string;
}

export const Thumbnail = ({
  type,
  extension,
  url = "",
  imageClassName,
  className,
}: Props) => {
  const isImage = type === "image" && extension !== "svg";

  return (
    <figure className={cn("thumbnail", className)}>
      <Image
        src={isImage ? url : getFileIcon(extension, type)}
        alt="thumbnail"
        width={100}
        height={100}
        className={cn(
          "size-8 object-contain",
          // For real image previews let `thumbnail-image` (size-full/object-cover)
          // own the sizing so it fills the circle. The icon-sized `imageClassName`
          // only applies to file-type icons. (Tailwind v4 doesn't resolve the
          // size-11!/size-full! collision via layer order like v3 did.)
          isImage ? "thumbnail-image" : imageClassName,
        )}
      />
    </figure>
  );
};

export default Thumbnail;
