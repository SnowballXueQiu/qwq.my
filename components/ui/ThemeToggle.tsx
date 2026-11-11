"use client";

import { useEffect } from "react";
import { useSite } from "@/lib/store";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/tokens";

export function ThemeToggle({
  labels,
}: {
  labels: { theme: string; themePaper: string; themeBlueprint: string };
}) {
  const theme = useSite((s) => s.theme);
  const setTheme = useSite((s) => s.setTheme);

  // The inline script in the layout already applied the saved theme; sync the store to it.
  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === "paper" || current === "blueprint") setTheme(current);
  }, [setTheme]);

  const toggle = () => {
    const next: Theme = theme === "paper" ? "blueprint" : "paper";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={labels.theme}
      data-cursor={theme === "paper" ? labels.themeBlueprint : labels.themePaper}
      className="label flex items-center gap-1.5 border border-ink px-2 py-1 transition-colors hover:bg-ink hover:text-paper"
    >
      <span
        aria-hidden
        className="inline-block size-2.5 rounded-full border border-current"
        style={{
          background:
            theme === "paper"
              ? "linear-gradient(90deg, currentColor 50%, transparent 50%)"
              : "linear-gradient(90deg, transparent 50%, currentColor 50%)",
        }}
      />
      {theme === "paper" ? labels.themePaper : labels.themeBlueprint}
    </button>
  );
}
