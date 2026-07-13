import { Client, Account, TablesDB, Storage } from "appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

const client = new Client()
  .setEndpoint(appwriteConfig.endpointUrl)
  .setProject(appwriteConfig.projectId);

const account = new Account(client);
const tablesDB = new TablesDB(client);
const storage = new Storage(client);

export { client, account, tablesDB, storage };
