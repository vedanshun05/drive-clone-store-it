"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useFileSearch } from "@/components/FileSearchProvider";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const Search = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query") || "";
  const [query, setQuery] = useState(searchQuery);
  const { search, ensureFresh, ready, loading, error } = useFileSearch();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const results = query.trim() && ready ? search(query) : [];

  // Clear the input when the URL `?query` param is removed (e.g. navigation).
  // Done during render (not an effect) per React 19 guidance to avoid the
  // "setState synchronously within an effect" cascading-render warning.
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setQuery(searchQuery);
  }

  const handleClickItem = (file: FileSearchEntry) => {
    setOpen(false);

    const params = new URLSearchParams({ query: file.name });
    router.push(
      `/${file.type === "video" || file.type === "audio" ? "media" : file.type + "s"}?${params}`,
    );
  };

  return (
    <div
      className="search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="search-input-wrapper">
        <Image
          src="/assets/icons/search.svg"
          alt="Search"
          width={24}
          height={24}
        />
        <Input
          value={query}
          placeholder="Search..."
          aria-label="Search files"
          onFocus={() => {
            ensureFresh();
            if (query.trim()) setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="search-input"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(Boolean(e.target.value.trim()));
            ensureFresh();
            if (!e.target.value && searchQuery) {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("query");
              router.replace(params.size ? `${path}?${params}` : path);
            }
          }}
        />

        {open && (
          <ul className="search-result">
            {results.length > 0 ? (
              results.map((file) => (
                <li key={file.$id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left hover:bg-light-400 focus-visible:outline-2 focus-visible:outline-brand"
                    onClick={() => handleClickItem(file)}
                  >
                    <div className="flex cursor-pointer items-center gap-4">
                      <Thumbnail
                        type={file.type}
                        extension={file.extension}
                        preview={false}
                        className="size-9 min-w-9"
                      />
                      <p className="subtitle-2 line-clamp-1 text-light-100">
                        {file.name}
                      </p>
                    </div>

                    <FormattedDateTime
                      date={file.$createdAt}
                      className="caption line-clamp-1 text-light-200"
                    />
                  </button>
                </li>
              ))
            ) : (
              <li className="empty-result" role="status">
                {!ready && loading
                  ? "Loading your file index…"
                  : error
                    ? "Unable to refresh files. Focus the search to retry."
                    : "No files found"}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
