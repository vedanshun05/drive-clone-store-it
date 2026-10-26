import { getFileSearchIndex } from "@/lib/actions/file.actions";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    return Response.json(await getFileSearchIndex(), { headers });
  } catch (error) {
    const signedOut =
      error instanceof Error && error.message === "User is not authenticated.";
    return Response.json(
      {
        error: signedOut
          ? "Sign in to search files."
          : "Unable to load files. Please try again.",
      },
      { status: signedOut ? 401 : 503, headers },
    );
  }
}
