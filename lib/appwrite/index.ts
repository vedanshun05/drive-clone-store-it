"use server";

import { Client, Account, TablesDB, Storage } from "node-appwrite";
import { cookies } from "next/headers";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;

export const createSessionClient = async () => {
  if (!endpoint || !projectId) {
    throw new Error(
      "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID env vars"
    );
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  const session = (await cookies()).get("appwrite-session");

  if (!session || !session.value) {
    throw new Error("No session");
  }

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

  if (!endpoint || !projectId || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, or NEXT_APPWRITE_SECRET_KEY env vars"
    );
  }

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
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
  };
};
