"use client";

import { useEffect, useState } from "react";
import { emit, on } from "@/lib/fx";
import { lockScroll } from "@/lib/scroll";

/** Pulls the camera back into the 3D overview map, and labels the screen while it's open. */
export function MenuButton({ labels }: { labels: { open: string; close: string; hint: string } }) {
  const [open, setOpen] = useState(false);

  useEffect(() => on("menu", ({ open }) => setOpen(open)), []);
  useEffect(() => {
    lockScroll(open);
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && emit("menu", { open: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        data-cursor={open ? "CLOSE" : "MAP"}
        onClick={() => emit("menu", { open: !open })}
        className={`label border px-2 py-1 transition-colors ${
          open ? "border-accent bg-accent text-paper" : "border-ink hover:bg-ink hover:text-paper"
        }`}
      >
        {open ? labels.close : labels.open}
      </button>
      {open && (
        <p className="label pointer-events-none fixed left-1/2 top-[86px] z-[65] -translate-x-1/2 bg-ink px-2 py-1 text-paper">
          {labels.hint}
        </p>
      )}
    </>
  );
}
