"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createFileSearchIndex } from "@/lib/search";

const FilesContext = createContext<{
  search: (query: string) => FileSearchEntry[];
  ensureFresh: () => Promise<void>;
  loading: boolean;
  ready: boolean;
  error: boolean;
} | null>(null);

export const FILES_CHANGED_EVENT = "storeit:files-changed";

export function FileSearchProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [files, setFiles] = useState<FileSearchEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchedAt = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const mounted = useRef(false);
  const dirty = useRef(false);
  const reload = useRef<(() => Promise<void>) | null>(null);
  const load = useCallback((force = false): Promise<void> => {
    if (inFlight.current) {
      if (force) dirty.current = true;
      return inFlight.current;
    }
    if (!force && Date.now() - fetchedAt.current < 30_000)
      return Promise.resolve();
    setLoading(true);
    const task = (async () => {
      try {
        const response = await fetch("/api/search", { cache: "no-store" });
        if (!response.ok)
          throw new Error("Unable to refresh the search index.");
        const next: FileSearchEntry[] = await response.json();
        if (!mounted.current) return;
        fetchedAt.current = Date.now();
        setFiles(next);
        setReady(true);
        setError(false);
      } catch {
        if (mounted.current) setError(true);
      } finally {
        if (mounted.current) setLoading(false);
        inFlight.current = null;
        if (dirty.current && mounted.current) {
          dirty.current = false;
          window.setTimeout(() => reload.current?.(), 0);
        }
      }
    })();
    inFlight.current = task;
    return task;
  }, []);
  useEffect(() => {
    mounted.current = true;
    reload.current = () => load(true);
    const initial = window.setTimeout(load, 0);
    const refresh = () => {
      if (document.visibilityState === "visible") load(true);
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    window.addEventListener(FILES_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      mounted.current = false;
      reload.current = null;
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(FILES_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  const index = useMemo(() => createFileSearchIndex(files), [files]);
  const search = useCallback(
    (query: string) =>
      index.search(query.trim(), { limit: 10 }).map((match) => match.item),
    [index],
  );
  return (
    <FilesContext.Provider
      value={{ search, ensureFresh: load, ready, loading, error }}
    >
      {children}
    </FilesContext.Provider>
  );
}

export function useFileSearch() {
  const value = useContext(FilesContext);
  if (!value) throw new Error("Search must be inside FileSearchProvider.");
  return value;
}
