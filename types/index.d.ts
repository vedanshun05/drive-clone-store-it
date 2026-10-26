declare type FileType = "document" | "image" | "video" | "audio" | "other";

declare interface ActionType {
  label: string;
  icon: string;
  value: string;
}

declare interface SearchParamProps {
  params?: Promise<SegmentParams>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

declare interface UploadFileProps {
  file: File;
  ownerId: string;
  accountId: string;
  path: string;
}
declare type FileScope = "all" | "owned" | "shared";

declare interface GetFilesProps {
  scope?: FileScope;
  types?: FileType[];
  searchText?: string;
  sort?: string;
  limit?: number;
}
declare interface RenameFileProps {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}
declare interface UpdateFileUsersProps {
  fileId: string;
  emails: string[];
  path: string;
}
declare interface DeleteFileProps {
  fileId: string;
  bucketFileId: string;
  path: string;
}

declare interface FileUploaderProps {
  ownerId: string;
  accountId: string;
  className?: string;
}

declare interface MobileNavigationProps {
  ownerId: string;
  accountId: string;
  fullName: string;
  avatar: string;
  email: string;
}
declare interface SidebarProps {
  fullName: string;
  avatar: string;
  email: string;
}

declare interface AppwriteFile {
  $id: string;
  $sequence: string;
  $tableId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  type: FileType;
  name: string;
  url: string;
  extension: string;
  size: number;
  owner: {
    $id: string;
    fullName: string;
    email: string;
    avatar: string;
    accountId: string;
  };
  accountId: string;
  users: string[];
  bucketFileId: string;
}

declare interface ShareInputProps {
  file: AppwriteFile;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (email: string) => void;
}

declare interface TotalFileSpaceUsed {
  document: { size: number; latestDate: string };
  image: { size: number; latestDate: string };
  video: { size: number; latestDate: string };
  audio: { size: number; latestDate: string };
  other: { size: number; latestDate: string };
  used: number;
  all: number;
}

declare interface ShareNotification {
  id: string;
  fileName: string;
  ownerName: string;
  url: string;
  eventAt: string;
  read: boolean;
}

declare interface ShareInbox {
  notifications: ShareNotification[];
  unreadCount: number;
}

declare type FileSearchEntry = Pick<
  AppwriteFile,
  "$id" | "name" | "type" | "extension" | "url" | "$createdAt"
>;
