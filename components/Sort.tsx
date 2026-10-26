"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sortTypes } from "@/constants";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const Sort = () => {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected =
    sortTypes.find((sort) => sort.value === searchParams.get("sort")) ||
    sortTypes[0];

  const handleSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`${path}?${params}`);
  };

  return (
    <Select onValueChange={handleSort} value={selected.value}>
      <SelectTrigger aria-label="Sort files" className="sort-select">
        <SelectValue>{selected.label}</SelectValue>
      </SelectTrigger>
      <SelectContent className="sort-select-content">
        {sortTypes.map((sort) => (
          <SelectItem
            key={sort.label}
            className="shad-select-item"
            value={sort.value}
          >
            {sort.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default Sort;
