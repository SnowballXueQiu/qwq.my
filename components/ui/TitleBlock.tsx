"use client";

import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { sheetNumber, sheets, type SheetId } from "@/lib/sheets";
import { useSite } from "@/lib/store";
import { ScrambleText } from "./ScrambleText";

type Labels = {
  drawnBy: string;
  dwgNo: string;
  sheet: string;
  scale: string;
  rev: string;
  progress: string;
};

/** The drawing's title block: who drew it, which sheet you're on, how far along. */
export function TitleBlock({
  locale,
  author,
  labels,
  titles,
}: {
  locale: Locale;
  author: string;
  labels: Labels;
  titles: Record<SheetId, string>;
}) {
  const isHome = usePathname() === `/${locale}`;
  const sheet = useSite((s) => s.sheet);
  const percent = useSite((s) => Math.round(s.progress * 100));
  const id = isHome ? sheets[sheet] : null;
  const title = id ? titles[id] : "—";
  const number = id ? sheetNumber(id) : "--";

  const cell = "border-ink px-2 py-1";
  return (
    <div
      className="pointer-events-auto hidden w-[340px] border-l border-t border-ink bg-paper text-ink md:block"
      aria-hidden
    >
      <div className="grid grid-cols-[1fr_1fr_64px] border-b border-ink">
        <div className={`${cell} border-r`}>
          <div className="label text-ink-soft">{labels.drawnBy}</div>
          <div className="font-mono text-xs">{author}</div>
        </div>
        <div className={`${cell} border-r`}>
          <div className="label text-ink-soft">{labels.dwgNo}</div>
          <div className="font-mono text-xs">QWQ-{number}00</div>
        </div>
        <div className={cell}>
          <div className="label text-ink-soft">{labels.rev}</div>
          <div className="font-mono text-xs text-accent">A</div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_64px] border-b border-ink">
        <div className={`${cell} flex items-baseline gap-2 border-r py-2`}>
          <span className="font-mono text-xs text-accent">{number}</span>
          <ScrambleText
            text={title}
            className="font-display text-2xl font-extrabold leading-none tracking-tight"
          />
        </div>
        <div className={cell}>
          <div className="label text-ink-soft">{labels.scale}</div>
          <div className="font-mono text-xs">1:1</div>
        </div>
      </div>
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span className="label text-ink-soft">
          {labels.sheet} {number}/{String(sheets.length).padStart(2, "0")}
        </span>
        <span className="relative h-1.5 flex-1 border border-ink">
          <span
            className="absolute inset-y-0 left-0 bg-accent"
            style={{ width: `${percent}%` }}
          />
        </span>
        <span className="w-9 text-right font-mono text-xs tabular-nums">
          {String(percent).padStart(3, "0")}%
        </span>
      </div>
    </div>
  );
}
