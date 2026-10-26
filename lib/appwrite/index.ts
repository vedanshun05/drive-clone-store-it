import "server-only";

import { Client, Account, TablesDB, Storage, Avatars } from "node-appwrite";
import { cookies } from "next/headers";
import { appwriteConfig } from "@/lib/appwrite/config";

export const createSessionClient = async () => {
  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId);

  const session = (await cookies()).get("appwrite-session");

  if (!session || !session.value) throw new Error("No session");

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
  };
};

export const createAdminClient = async () => {
  const secretKey = process.env.NEXT_APPWRITE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing NEXT_APPWRITE_SECRET_KEY env var");
  }

  const client = new Client()
    .setEndpoint(appwriteConfig.endpointUrl)
    .setProject(appwriteConfig.projectId)
    .setKey(secretKey);

  return {
    get account() {
      return new Account(client);
    },
    get tablesDB() {
      return new TablesDB(client);
    },
    get storage() {
      return new Storage(client);
    },
    get avatars() {
      return new Avatars(client);
    },
  };
};
