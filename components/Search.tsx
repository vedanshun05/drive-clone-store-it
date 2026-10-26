"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { getFiles } from "@/lib/actions/file.actions";
import Thumbnail from "@/components/Thumbnail";
import FormattedDateTime from "@/components/FormattedDateTime";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";

const Search = () => {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("query") || "";
  const [query, setQuery] = useState(searchQuery);
  const [results, setResults] = useState<AppwriteFile[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    let cancelled = false;
    const fetchFiles = async () => {
      if (debouncedQuery.length === 0) {
        setResults([]);
        setOpen(false);
        return;
      }

      try {
        const files = await getFiles({
          types: [],
          searchText: debouncedQuery,
          limit: 10,
        });
        if (!cancelled) {
          setResults(files.rows);
          setOpen(true);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setOpen(false);
          toast.error("Unable to search files. Please try again.");
        }
      }
    };

    fetchFiles();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // Clear the input when the URL `?query` param is removed (e.g. navigation).
  // Done during render (not an effect) per React 19 guidance to avoid the
  // "setState synchronously within an effect" cascading-render warning.
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setQuery(searchQuery);
  }

  const handleClickItem = (file: AppwriteFile) => {
    setOpen(false);
    setResults([]);

    const params = new URLSearchParams({ query });
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
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          className="search-input"
          onChange={(e) => {
            setQuery(e.target.value);
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
                        url={file.url}
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
              <p className="empty-result">No files found</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Search;
