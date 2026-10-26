"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const scopes = [
  { value: "all", label: "All files" },
  { value: "owned", label: "My files" },
  { value: "shared", label: "Shared with me" },
];

export default function FileScopeFilter() {
  const path = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const value = scopes.some(
    (scope) => scope.value === searchParams.get("scope"),
  )
    ? searchParams.get("scope")!
    : "all";
  return (
    <Select
      value={value}
      onValueChange={(scope) => {
        const params = new URLSearchParams(searchParams.toString());
        if (scope === "all") params.delete("scope");
        else params.set("scope", scope);
        router.push(params.size ? `${path}?${params}` : path);
      }}
    >
      <SelectTrigger className="sort-select" aria-label="File visibility">
        <SelectValue>
          {scopes.find((scope) => scope.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="sort-select-content">
        {scopes.map((scope) => (
          <SelectItem key={scope.value} value={scope.value}>
            {scope.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
