"use client";

import { emit } from "@/lib/fx";

export function DebugButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      data-cursor="PLAY"
      onClick={() => emit("game", { open: true })}
      className="label mt-4 w-full border border-accent px-3 py-2 text-accent transition-colors hover:bg-accent hover:text-paper"
    >
      ▶ {label}
    </button>
  );
}
