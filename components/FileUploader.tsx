"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { cn, getFileType } from "@/lib/utils";
import Image from "next/image";
import Thumbnail from "@/components/Thumbnail";
import { MAX_FILE_SIZE } from "@/constants";
import { uploadFile } from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

interface Props {
  ownerId: string;
  accountId: string;
  className?: string;
}

const FileUploader = ({ ownerId, accountId, className }: Props) => {
  const path = usePathname();
  const [files, setFiles] = useState<{ file: File; url?: string }[]>([]);
  const previews = useRef(new Map<File, string>());
  useEffect(() => {
    const urls = previews.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  const releasePreview = useCallback((file: File) => {
    const url = previews.current.get(file);
    if (url) URL.revokeObjectURL(url);
    previews.current.delete(file);
  }, []);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const entries = acceptedFiles.map((file) => {
        let url: string | undefined;
        if (
          file.size <= MAX_FILE_SIZE &&
          getFileType(file.name).type === "image"
        ) {
          url = URL.createObjectURL(file);
          previews.current.set(file, url);
        }
        return { file, url };
      });
      setFiles((previous) => [...previous, ...entries]);

      const uploadPromises = acceptedFiles.map(async (file) => {
        if (file.size > MAX_FILE_SIZE) {
          setFiles((prevFiles) =>
            prevFiles.filter((entry) => entry.file !== file),
          );
          return toast.error(
            `${file.name} is too large. Max file size is 4 MB.`,
          );
        }

        try {
          await uploadFile({ file, ownerId, accountId, path });
        } catch {
          toast.error(`Unable to upload ${file.name}. Please try again.`);
        } finally {
          releasePreview(file);
          setFiles((prevFiles) =>
            prevFiles.filter((entry) => entry.file !== file),
          );
        }
      });

      await Promise.all(uploadPromises);
    },
    [ownerId, accountId, path, releasePreview],
  );

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const handleRemoveFile = (
    e: React.MouseEvent<HTMLButtonElement>,
    file: File,
  ) => {
    e.stopPropagation();
    releasePreview(file);
    setFiles((prevFiles) => prevFiles.filter((entry) => entry.file !== file));
  };

  return (
    <div {...getRootProps()} className="cursor-pointer">
      <input {...getInputProps()} />
      <Button type="button" className={cn("uploader-button", className)}>
        <Image
          src="/assets/icons/upload.svg"
          alt="upload"
          width={24}
          height={24}
        />{" "}
        <p>Upload</p>
      </Button>
      {files.length > 0 && (
        <ul className="uploader-preview-list">
          <h4 className="h4 text-light-100">Uploading</h4>

          {files.map(({ file, url }, index) => {
            const { type, extension } = getFileType(file.name);

            return (
              <li
                key={`${file.name}-${index}`}
                className="uploader-preview-item"
              >
                <div className="flex items-center gap-3">
                  <Thumbnail type={type} extension={extension} url={url} />

                  <div>
                    <p className="preview-item-name">{file.name}</p>
                    <Image
                      src="/assets/icons/file-loader.gif"
                      width={80}
                      height={26}
                      alt="Loader"
                      unoptimized
                      style={{ height: "auto" }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(event) => handleRemoveFile(event, file)}
                  aria-label={`Hide upload progress for ${file.name}`}
                  title="Hide progress; upload continues"
                  className="shrink-0 rounded-full p-1 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <Image
                    src="/assets/icons/remove.svg"
                    width={24}
                    height={24}
                    alt=""
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
