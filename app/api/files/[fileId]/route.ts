import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { Query } from "node-appwrite";

export const runtime = "nodejs";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return Response.json(
        { error: "Sign in to access this file." },
        { status: 401, headers: privateHeaders },
      );

    const { fileId } = await params;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/.test(fileId)) {
      return Response.json(
        { error: "File not found." },
        { status: 404, headers: privateHeaders },
      );
    }
    const { tablesDB, storage } = await createAdminClient();
    // Authorization is checked on every request, including after sharing is revoked.
    const files = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId,
      tableId: appwriteConfig.filesTableId,
      queries: [
        Query.equal("bucketFileId", [fileId]),
        Query.or([
          Query.equal("owner", [user.$id]),
          Query.contains("users", [user.email]),
        ]),
        Query.limit(1),
      ],
    });
    if (!files.rows.length)
      return Response.json(
        { error: "File not found." },
        { status: 404, headers: privateHeaders },
      );

    const metadata = await storage.getFile({
      bucketId: appwriteConfig.bucketId,
      fileId,
    });
    const bytes = await storage.getFileView({
      bucketId: appwriteConfig.bucketId,
      fileId,
    });
    const safeInline =
      /^(image\/(jpeg|png|webp|gif|bmp|avif)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf|text\/plain)$/.test(
        metadata.mimeType,
      );
    const download =
      new URL(request.url).searchParams.get("download") === "1" || !safeInline;
    // Prevent control characters, quotes, and path separators in response headers.
    const name = String(files.rows[0].name || metadata.name).replace(
      // eslint-disable-next-line no-control-regex -- Remove header control characters.
      /[\x00-\x1f\x7f]/g,
      "",
    );
    const fallback = name.replace(/[^\x20-\x7e]|["\\/]/g, "_") || "download";
    const encodedName = encodeURIComponent(name || "download").replace(
      /['()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": metadata.mimeType,
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fallback}"; filename*=UTF-8''${encodedName}`,
        "X-Content-Type-Options": "nosniff",
        // Safe media types cannot execute uploaded scripts. Allow the browser's
        // native image/media viewer to style and load its same-origin content.
        "Content-Security-Policy": safeInline
          ? "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; frame-ancestors 'none'"
          : "sandbox; default-src 'none'",
      },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 404) {
      return Response.json(
        { error: "File not found." },
        { status: 404, headers: privateHeaders },
      );
    }
    console.error("Unable to serve private file", error);
    return Response.json(
      { error: "File storage is temporarily unavailable." },
      { status: 503, headers: privateHeaders },
    );
  }
}
