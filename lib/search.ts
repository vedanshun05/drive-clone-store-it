import Fuse from "fuse.js";

export function createFileSearchIndex<T extends { name: string }>(files: T[]) {
  const index = new Fuse(files, {
    keys: ["name"],
    useTokenSearch: true,
    tokenMatch: "all",
    threshold: 0.4,
    ignoreLocation: true,
    shouldSort: true,
  });
  return {
    search: (query: string, options?: { limit: number }) =>
      query.trim() ? index.search(query, options) : [],
  };
}
