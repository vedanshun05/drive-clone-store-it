import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";

// One inbox entry per file/recipient: unchanged shares do not create duplicates,
// and sharing again resets the existing entry to unread.
export const shareNotificationId = (fileId: string, email: string) =>
  createHash("sha256")
    .update(JSON.stringify([fileId, email]))
    .digest("hex")
    .slice(0, 32);

export async function prepareShareNotifications(
  file: { $id: string; users?: string[]; owner?: { email?: string } | string },
  emails: string[],
) {
  const existing = new Set(file.users || []);
  const ownerEmail =
    typeof file.owner === "object" ? file.owner.email : undefined;
  const added = emails.filter(
    (email) => !existing.has(email) && email !== ownerEmail,
  );
  if (!added.length) return;
  const { tablesDB } = await createAdminClient();
  const eventAt = new Date().toISOString();
  // Prepare before granting access. If preparation fails, sharing can be retried.
  // Inbox reads independently check the current file ACL, so a failed share
  // cannot expose an invitation or file to its intended recipient.
  await Promise.all(
    added.map((recipient) =>
      tablesDB.upsertRow({
        databaseId: appwriteConfig.databaseId,
        tableId: appwriteConfig.notificationsTableId,
        rowId: shareNotificationId(file.$id, recipient),
        data: { recipient, fileId: file.$id, read: false, eventAt },
      }),
    ),
  );
}
