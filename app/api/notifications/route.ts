import { getShareNotifications } from "@/lib/actions/notification.actions";

export const runtime = "nodejs";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET() {
  try {
    return Response.json(await getShareNotifications(), { headers });
  } catch (error) {
    const signedOut =
      error instanceof Error && error.message === "User is not authenticated.";
    return Response.json(
      {
        error: signedOut
          ? "Sign in to view notifications."
          : "Unable to load notifications. Please try again.",
      },
      { status: signedOut ? 401 : 503, headers },
    );
  }
}
