"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { emit, on } from "@/lib/fx";
import type { Locale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll";
import { sitePipeline } from "@/components/three/pipeline/InkPipeline";

// Remotion and the composition only load once someone presses play.
const YearPlayer = dynamic(() => import("./YearPlayer"), {
  ssr: false,
  loading: () => <div className="aspect-video w-full animate-pulse bg-[#f1ede4]/10" />,
});

export function YearInReviewModal({
  locale,
  videoUrl,
  labels,
}: {
  locale: Locale;
  /** Pre-rendered MP4 under /public, when one exists. */
  videoUrl: string | null;
  labels: { title: string; download: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => on("video", ({ open }) => setOpen(open)), []);

  useEffect(() => {
    lockScroll(open);
    // The player's ink pipeline drives the shared shader clock; let it have it.
    sitePipeline.paused = open;
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      sitePipeline.paused = false;
    };
  }, [open]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[#141414]/90 p-6"
      onMouseDown={(e) => e.target === e.currentTarget && emit("video", { open: false })}
    >
      <div className="w-[min(1100px,94vw)] border border-[#f1ede4]/50 bg-[#141414] font-mono text-[#f1ede4] shadow-[10px_10px_0_#e8402a]">
        <div className="flex items-center justify-between border-b border-[#f1ede4]/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f1ede4]/70">
          <span>▶ {labels.title}</span>
          <span className="flex gap-4">
            {videoUrl && (
              <a href={videoUrl} download className="hover:text-[#e8402a]">
                ↓ {labels.download}
              </a>
            )}
            <button type="button" onClick={() => emit("video", { open: false })} className="hover:text-[#e8402a]">
              {labels.close} ✕
            </button>
          </span>
        </div>
        <YearPlayer locale={locale} />
      </div>
    </div>
  );
}
