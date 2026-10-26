export const navItems = [
  { name: "Dashboard", icon: "/assets/icons/dashboard.svg", url: "/" },
  { name: "Documents", icon: "/assets/icons/documents.svg", url: "/documents" },
  { name: "Images", icon: "/assets/icons/images.svg", url: "/images" },
  { name: "Media", icon: "/assets/icons/video.svg", url: "/media" },
  { name: "Others", icon: "/assets/icons/others.svg", url: "/others" },
  {
    name: "Shared files",
    icon: "/assets/icons/shared-files.svg",
    url: "/shared",
  },
];

export const actionsDropdownItems = [
  {
    label: "Rename",
    icon: "/assets/icons/edit.svg",
    value: "rename",
  },
  {
    label: "Details",
    icon: "/assets/icons/info.svg",
    value: "details",
  },
  {
    label: "Share",
    icon: "/assets/icons/share.svg",
    value: "share",
  },
  {
    label: "Download",
    icon: "/assets/icons/download.svg",
    value: "download",
  },
  {
    label: "Delete",
    icon: "/assets/icons/delete.svg",
    value: "delete",
  },
];

export const sortTypes = [
  {
    label: "Date created (newest)",
    value: "$createdAt-desc",
  },
  {
    label: "Created Date (oldest)",
    value: "$createdAt-asc",
  },
  {
    label: "Name (A-Z)",
    value: "name-asc",
  },
  {
    label: "Name (Z-A)",
    value: "name-desc",
  },
  {
    label: "Size (Highest)",
    value: "size-desc",
  },
  {
    label: "Size (Lowest)",
    value: "size-asc",
  },
];

export const avatarPlaceholderUrl =
  "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg";

// Leave room for multipart fields beneath Vercel's 4.5 MB request limit.
export const MAX_FILE_SIZE = 4 * 1024 * 1024;
