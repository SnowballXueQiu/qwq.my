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

type Named = { number: string; title: string; dwg: string; sheet: string; long?: boolean };

/**
 * The drawing's title block: who drew it, which sheet you're on, how far along. On the
 * home page that's one of its sheets; elsewhere it names the page: the blog (sheet 06,
 * where the home page lists the writing), a post by its BLOG number, or the lab.
 */
export function TitleBlock({
  locale,
  author,
  labels,
  titles,
  posts,
  labLabel,
}: {
  locale: Locale;
  author: string;
  labels: Labels;
  titles: Record<SheetId, string>;
  /** Newest first, as the blog lists them. */
  posts: { slug: string; title: string }[];
  labLabel: string;
}) {
  const [, section, slug] = usePathname().slice(locale.length + 1).split("/");
  const sheet = useSite((s) => s.sheet);
  const percent = useSite((s) => Math.round(s.progress * 100));
  const ofSheets = String(sheets.length).padStart(2, "0");

  let named: Named = { number: "--", title: "—", dwg: "QWQ---00", sheet: `--/${ofSheets}` };
  const post = section === "blog" && slug !== "tag" ? posts.findIndex((p) => p.slug === slug) : -1;
  if (section === undefined) {
    const n = sheetNumber(sheets[sheet]);
    named = { number: n, title: titles[sheets[sheet]], dwg: `QWQ-${n}00`, sheet: `${n}/${ofSheets}` };
  } else if (post >= 0) {
    const n = String(posts.length - post).padStart(3, "0");
    named = { number: n, title: posts[post].title, dwg: `BLOG-${n}`, sheet: `${n}/${String(posts.length).padStart(3, "0")}`, long: true };
  } else if (section === "blog") {
    const n = sheetNumber("writing");
    named = { number: n, title: titles.writing, dwg: `QWQ-${n}00`, sheet: `${n}/${ofSheets}` };
  } else if (section === "lab") {
    named = { number: "LB", title: labLabel, dwg: "QWQ-LAB", sheet: `--/${ofSheets}` };
  }
  const { number, title } = named;

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
          <div className="font-mono text-xs">{named.dwg}</div>
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
            className={
              named.long
                ? "font-display line-clamp-2 text-[15px] font-bold leading-tight"
                : "font-display text-2xl font-extrabold leading-none tracking-tight"
            }
          />
        </div>
        <div className={cell}>
          <div className="label text-ink-soft">{labels.scale}</div>
          <div className="font-mono text-xs">1:1</div>
        </div>
      </div>
      <div className="flex items-center gap-3 px-2 py-1.5">
        <span className="label text-ink-soft">
          {labels.sheet} {named.sheet}
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
