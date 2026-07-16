"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Theme = "cartoon" | "original";

/**
 * Flips the app between the cartoon and original themes by toggling
 * `html[data-theme]` (persisted to localStorage). The icon is the *opposite*
 * theme's logo mark — an invitation to switch — driven purely by CSS visibility
 * (`.theme-cartoon-only` / `.theme-original-only`), so it swaps instantly.
 */
const ThemeToggle = ({ className }: { className?: string }) => {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as Theme) || "cartoon";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme =
      (document.documentElement.dataset.theme as Theme) === "original"
        ? "cartoon"
        : "original";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    // keep the tab favicon in sync with the active theme
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) {
      link.href =
        next === "original"
          ? "/assets/icons/logo-brand-original.svg"
          : "/icon.svg";
    }
    setTheme(next);
  };

  const label =
    theme === "original"
      ? "Switch to the cartoon theme"
      : "Switch to the original theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "theme-toggle-btn flex-center shrink-0 rounded-full border-2 border-line bg-brand/10 p-1.5 shadow-drop-3 transition-all hover:bg-brand/20 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
        "size-[52px] min-w-[52px]",
        className,
      )}
    >
      {/* shown in CARTOON mode → original coral mark (go original) */}
      <Image
        src="/assets/icons/logo-brand-original.svg"
        alt=""
        width={28}
        height={28}
        className="theme-cartoon-only size-7"
      />
      {/* shown in ORIGINAL mode → cartoon emerald mark (go cartoon) */}
      <Image
        src="/assets/icons/logo-brand.svg"
        alt=""
        width={28}
        height={28}
        className="theme-original-only size-7"
      />
    </button>
  );
};

export default ThemeToggle;
