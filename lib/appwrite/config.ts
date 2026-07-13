const endpointUrl = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID;
const filesTableId = process.env.NEXT_PUBLIC_APPWRITE_FILES_TABLE_ID;
const bucketId = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID;

if (
  !endpointUrl ||
  !projectId ||
  !databaseId ||
  !usersTableId ||
  !filesTableId ||
  !bucketId
) {
  throw new Error(
    "Missing one or more required NEXT_PUBLIC_APPWRITE_* env vars (ENDPOINT, PROJECT_ID, DATABASE_ID, USERS_TABLE_ID, FILES_TABLE_ID, BUCKET_ID)"
  );
}

export const appwriteConfig = {
  endpointUrl,
  projectId,
  databaseId,
  usersTableId,
  filesTableId,
  bucketId,
  secretKey: process.env.NEXT_APPWRITE_SECRET_KEY,
};
