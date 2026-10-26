"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { FILES_CHANGED_EVENT } from "@/components/FileSearchProvider";
import { useRouter } from "next/navigation";
import { Bell, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  getShareNotifications,
  markShareNotificationRead,
  markAllShareNotificationsRead,
} from "@/lib/actions/notification.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import FormattedDateTime from "@/components/FormattedDateTime";

type InboxState = {
  inbox: ShareInbox;
  loading: boolean;
  error: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};
const InboxContext = createContext<InboxState | null>(null);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [inbox, setInbox] = useState<ShareInbox>({
    notifications: [],
    unreadCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();
  const known = useRef<Set<string> | null>(null);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++request.current;
    setLoading(true);
    try {
      const next = await getShareNotifications();
      if (version !== request.current) return;
      const keys = new Set(
        next.notifications.map((item) => `${item.id}:${item.eventAt}`),
      );
      if (known.current) {
        if (
          keys.size !== known.current.size ||
          [...keys].some((key) => !known.current?.has(key))
        ) {
          window.dispatchEvent(new Event(FILES_CHANGED_EVENT));
          router.refresh();
        }
        const added = next.notifications.filter(
          (item) =>
            !item.read && !known.current?.has(`${item.id}:${item.eventAt}`),
        );
        if (added.length) {
          toast.info(
            added.length === 1
              ? `${added[0].ownerName} shared ${added[0].fileName} with you`
              : `${added.length} new files shared with you`,
          );
        }
      }
      known.current = keys;
      setInbox(next);
      setError(false);
    } catch {
      if (version === request.current) setError(true);
    } finally {
      if (version === request.current) setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    const initial = window.setTimeout(refresh, 0);
    const check = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const timer = window.setInterval(check, 30_000);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      ++request.current;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [refresh]);
  const markRead = async (id: string) => {
    try {
      await markShareNotificationRead(id);
      ++request.current;
      setLoading(false);
      setInbox((current) => ({
        unreadCount: Math.max(
          0,
          current.unreadCount -
            (current.notifications.some((item) => item.id === id && !item.read)
              ? 1
              : 0),
        ),
        notifications: current.notifications.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      }));
    } catch {
      toast.error(
        "Unable to mark this notification as read. Please try again.",
      );
    }
  };
  const markAllRead = async () => {
    try {
      await markAllShareNotificationsRead();
      ++request.current;
      setLoading(false);
      setInbox((current) => ({
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({
          ...item,
          read: true,
        })),
      }));
    } catch {
      toast.error("Unable to mark notifications as read. Please try again.");
    }
  };
  return (
    <InboxContext.Provider
      value={{ inbox, loading, error, refresh, markRead, markAllRead }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export default function Notifications() {
  const state = useContext(InboxContext);
  const [pending, setPending] = useState<string | null>(null);
  if (!state) return null;
  const { inbox, loading, error, refresh, markRead, markAllRead } = state;
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) refresh();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          aria-label={`Notifications, ${inbox.unreadCount} unread`}
          className="relative size-11 shrink-0 rounded-full bg-brand/10 p-0 text-brand shadow-none hover:bg-brand/20 sm:size-[52px]"
        >
          <Bell className="size-5" aria-hidden="true" />
          {inbox.unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white"
            >
              {inbox.unreadCount > 99 ? "99+" : inbox.unreadCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="shad-dialog max-h-[85dvh] overflow-y-auto bg-white text-light-100">
        <DialogHeader>
          <DialogTitle className="text-center text-light-100">
            Notifications
          </DialogTitle>
          <DialogDescription className="text-center">
            Files shared with you. {inbox.unreadCount} unread notification
            {inbox.unreadCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm text-light-200">Latest 25 shared files</p>
            {inbox.unreadCount > 0 && (
              <button
                type="button"
                disabled={pending === "all"}
                onClick={async () => {
                  setPending("all");
                  try {
                    await markAllRead();
                  } finally {
                    setPending(null);
                  }
                }}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            disabled={loading}
            onClick={() => refresh()}
            aria-label="Refresh notifications"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </Button>
        </div>
        {error ? (
          <p role="status" className="text-sm text-red-700">
            Unable to refresh notifications. Try the refresh button.
          </p>
        ) : null}
        {loading && !inbox.notifications.length ? (
          <p role="status" className="py-6 text-center text-sm text-light-200">
            Loading notifications…
          </p>
        ) : !inbox.notifications.length && !error ? (
          <p className="py-6 text-center text-sm text-light-200">
            No shared-file notifications yet.
          </p>
        ) : null}
        <ul className="space-y-3">
          {inbox.notifications.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-4 ${item.read ? "border-light-300 bg-white" : "border-brand/20 bg-brand/5"}`}
            >
              <p className="break-words text-sm">
                <span className="font-semibold">{item.ownerName}</span> shared{" "}
                <span className="font-semibold">{item.fileName}</span> with you.
              </p>
              <FormattedDateTime
                date={item.eventAt}
                className="mt-1 text-xs text-light-200"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    if (!item.read) markRead(item.id);
                  }}
                  className="text-sm font-semibold text-brand underline-offset-4 hover:underline"
                >
                  Open file
                  <span className="sr-only">
                    : {item.fileName} (opens in a new tab)
                  </span>
                </a>
                {item.read ? (
                  <span className="flex items-center gap-1 text-xs text-light-200">
                    <Check className="size-3" aria-hidden="true" />
                    Read
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    disabled={pending === item.id}
                    onClick={async () => {
                      setPending(item.id);
                      try {
                        await markRead(item.id);
                      } finally {
                        setPending(null);
                      }
                    }}
                  >
                    Mark as read
                    <span className="sr-only">: {item.fileName}</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
