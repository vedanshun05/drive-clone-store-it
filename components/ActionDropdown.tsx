"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import Image from "next/image";
import { actionsDropdownItems } from "@/constants";
import { constructDownloadUrl, getFileBaseName } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  deleteFile,
  renameFile,
  updateFileUsers,
} from "@/lib/actions/file.actions";
import { usePathname } from "next/navigation";
import { FileDetails } from "@/components/ActionsModalContent";
import { ShareInput } from "@/components/ShareInput";
import { toast } from "sonner";
import { FILES_CHANGED_EVENT } from "@/components/FileSearchProvider";

const ActionDropdown = ({
  file,
  canManage = false,
}: {
  file: AppwriteFile;
  canManage?: boolean;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [action, setAction] = useState<ActionType | null>(null);
  const [name, setName] = useState(getFileBaseName(file.name, file.extension));
  const [isLoading, setIsLoading] = useState(false);
  // Draft entries are separate from the canonical shared list, which can refresh
  // after an action while the dialog is open.
  const [emails, setEmails] = useState<string[]>([]);

  const path = usePathname();

  const closeAllModals = () => {
    setIsModalOpen(false);
    setIsDropdownOpen(false);
    setAction(null);
    setName(getFileBaseName(file.name, file.extension));
    setEmails([]);
  };

  const handleAction = async () => {
    if (!action) return;
    setIsLoading(true);

    const actions = {
      rename: () =>
        renameFile({
          fileId: file.$id,
          name: file.extension ? `${name}.${file.extension}` : name,
          extension: file.extension,
          path,
        }),
      share: () =>
        updateFileUsers({
          fileId: file.$id,
          emails: [...file.users, ...emails],
          path,
        }),
      delete: () =>
        deleteFile({ fileId: file.$id, bucketFileId: file.bucketFileId, path }),
    };

    try {
      const success = await actions[action.value as keyof typeof actions]();
      if (success) {
        closeAllModals();
        window.dispatchEvent(new Event(FILES_CHANGED_EVENT));
      }
    } catch {
      toast.error("Unable to update the file. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveUser = async (email: string) => {
    setIsLoading(true);
    try {
      const updatedEmails = file.users.filter((e) => e !== email);
      const success = await updateFileUsers({
        fileId: file.$id,
        emails: updatedEmails,
        path,
      });
      if (success) {
        closeAllModals();
        window.dispatchEvent(new Event(FILES_CHANGED_EVENT));
      }
    } catch {
      toast.error("Unable to remove this person. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderDialogContent = () => {
    if (!action) return null;

    const { value, label } = action;

    return (
      <DialogContent className="shad-dialog button">
        <DialogHeader className="flex flex-col gap-3">
          <DialogTitle className="text-center text-light-100">
            {label}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Details and actions for {file.name}.
          </DialogDescription>
          {value === "rename" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  aria-label="File name"
                  type="text"
                  className="rename-input-field min-w-0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {file.extension && (
                  <span
                    aria-label="File extension"
                    className="shrink-0 rounded-full bg-brand/10 px-3 py-2 text-sm text-brand"
                  >
                    .{file.extension}
                  </span>
                )}
              </div>
              {file.extension && (
                <p className="text-left text-xs text-light-200">
                  The file extension stays the same.
                </p>
              )}
            </div>
          )}
          {value === "details" && <FileDetails file={file} />}
          {value === "share" && (
            <ShareInput
              file={file}
              onInputChange={setEmails}
              onRemove={handleRemoveUser}
              disabled={isLoading}
            />
          )}
          {value === "delete" && (
            <p className="delete-confirmation">
              Are you sure you want to delete{` `}
              <span className="delete-file-name">{file.name}</span>?
            </p>
          )}
        </DialogHeader>
        {["rename", "delete", "share"].includes(value) && (
          <DialogFooter className="flex flex-col gap-3 md:flex-row">
            <Button onClick={closeAllModals} className="modal-cancel-button">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={isLoading}
              className="modal-submit-button"
            >
              <p className="capitalize">{value}</p>
              {isLoading && (
                <Image
                  src="/assets/icons/loader.svg"
                  alt="loader"
                  width={24}
                  height={24}
                  className="animate-spin"
                />
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    );
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${file.name}`}
          className="shad-no-focus"
          disabled={isLoading}
        >
          <Image src="/assets/icons/dots.svg" alt="" width={34} height={34} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="max-w-[200px] truncate">
            {file.name}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {actionsDropdownItems
            .filter(
              (item) =>
                canManage || ["details", "download"].includes(item.value),
            )
            .map((actionItem) =>
              actionItem.value === "download" ? (
                <DropdownMenuItem
                  asChild
                  key={actionItem.value}
                  className="shad-dropdown-item"
                >
                  <a
                    href={constructDownloadUrl(file.bucketFileId)}
                    download={file.name}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src={actionItem.icon}
                      alt=""
                      width={30}
                      height={30}
                    />
                    {actionItem.label}
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={actionItem.value}
                  className="shad-dropdown-item"
                  onClick={() => {
                    setName(getFileBaseName(file.name, file.extension));
                    setEmails([]);
                    setAction(actionItem);

                    if (
                      ["rename", "share", "delete", "details"].includes(
                        actionItem.value,
                      )
                    ) {
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Image
                      src={actionItem.icon}
                      alt=""
                      width={30}
                      height={30}
                    />
                    {actionItem.label}
                  </div>
                </DropdownMenuItem>
              ),
            )}
        </DropdownMenuContent>
      </DropdownMenu>

      {renderDialogContent()}
    </Dialog>
  );
};
export default ActionDropdown;
