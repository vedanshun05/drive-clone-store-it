"use server";

import { Models, Query } from "node-appwrite";
import { z } from "zod";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { constructFileUrl } from "@/lib/utils";

type InboxRow = Models.Row & {
  recipient: string;
  fileId: string;
  read: boolean;
  eventAt: string;
};

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("User is not authenticated.");
  return user;
}

export async function getShareNotifications(): Promise<ShareInbox> {
  const user = await requireUser();
  const { tablesDB } = await createAdminClient();
  const entries: InboxRow[] = [];
  let cursor: string | undefined;
  let page;
  do {
    page = await tablesDB.listRows<InboxRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.notificationsTableId,
      queries: [
        Query.equal("recipient", user.email),
        Query.orderDesc("eventAt"),
        Query.limit(100),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    });
    entries.push(...page.rows);
    cursor = page.rows.at(-1)?.$id;
  } while (page.rows.length === 100);

  // Resolve in batches, checking today's access instead of trusting old events.
  // Revoked shares and deleted files disappear from the inbox immediately.
  const notifications: ShareNotification[] = [];
  for (let start = 0; start < entries.length; start += 100) {
    const batch = entries.slice(start, start + 100);
    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      queries: [
        Query.equal(
          "$id",
          batch.map((entry) => entry.fileId),
        ),
        Query.contains("users", [user.email]),
        Query.select(["*", "owner.*"]),
        Query.limit(100),
      ],
    });
    const byId = new Map(files.rows.map((file) => [file.$id, file]));
    for (const entry of batch) {
      const file = byId.get(entry.fileId);
      if (!file || file.owner?.$id === user.$id) continue;
      notifications.push({
        id: entry.$id,
        fileName: file.name,
        ownerName: file.owner?.fullName || "Someone",
        url: constructFileUrl(file.bucketFileId),
        eventAt: entry.eventAt,
        read: entry.read,
      });
    }
  }
  return {
    notifications: notifications.slice(0, 25),
    unreadCount: notifications.filter((entry) => !entry.read).length,
  };
}

export async function markShareNotificationRead(notificationId: string) {
  const user = await requireUser();
  z.string()
    .regex(/^[a-f0-9]{32}$/)
    .parse(notificationId);
  const { tablesDB } = await createAdminClient();
  const params = {
    databaseId: appwriteConfig.databaseId,
    tableId: appwriteConfig.notificationsTableId,
    rowId: notificationId,
  };
  const notification = await tablesDB.getRow<InboxRow>(params);
  if (notification.recipient !== user.email)
    throw new Error("Notification not found.");
  await tablesDB.updateRow({ ...params, data: { read: true } });
}

export async function markAllShareNotificationsRead() {
  const user = await requireUser();
  const { tablesDB } = await createAdminClient();
  let cursor: string | undefined;
  let page;
  do {
    page = await tablesDB.listRows<InboxRow>({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.notificationsTableId,
      queries: [
        Query.equal("recipient", user.email),
        Query.orderAsc("$id"),
        Query.limit(100),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    });
    await Promise.all(
      page.rows
        .filter((entry) => !entry.read)
        .map((entry) =>
          tablesDB.updateRow({
            databaseId: appwriteConfig.databaseId,
            tableId: appwriteConfig.notificationsTableId,
            rowId: entry.$id,
            data: { read: true },
          }),
        ),
    );
    cursor = page.rows.at(-1)?.$id;
  } while (page.rows.length === 100);
}
