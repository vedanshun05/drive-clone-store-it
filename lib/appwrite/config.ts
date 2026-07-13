import { Client, Account, TablesDB, Storage } from "appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

if (!endpoint || !projectId) {
  throw new Error(
    "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID env vars"
  );
}

const client = new Client().setEndpoint(endpoint).setProject(projectId);

const account = new Account(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

export { client, account, tablesDB, storage };
