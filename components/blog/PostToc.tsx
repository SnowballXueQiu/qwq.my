"use client";

import { useEffect, useRef, useState } from "react";
import { getLenis, prefersReducedMotion } from "@/lib/scroll";
import type { TocItem } from "@/lib/toc";

/** Where a heading counts as reached: a little below the top of the frame. */
const LINE = 140;

const NUMERALS = "一二三四五六七八九";

/**
 * A heading that carries its own number ("1. …", "一、…") gives it to the number column
 * instead of showing it twice. Chinese numerals up to 九十九 are read as numbers.
 */
function ownNumber(text: string): { n: number; rest: string } | null {
  const digits = /^(\d{1,2})[.．、)）]\s*(?!\d)(.+)$/.exec(text);
  if (digits) return { n: Number(digits[1]), rest: digits[2] };
  const han = /^([一二三四五六七八九十]{1,3})[、.．]\s*(.+)$/.exec(text);
  if (!han) return null;
  const [tens, ones] = han[1].includes("十") ? han[1].split("十") : ["", han[1]];
  const value = (h: string) => NUMERALS.indexOf(h) + 1;
  const n = (han[1].includes("十") ? (tens ? value(tens) : 1) * 10 : 0) + (ones ? value(ones) : 0);
  return n > 0 && n < 100 ? { n, rest: han[2] } : null;
}

/**
 * The post's contents, beside the column on wide screens. It shows the top two heading
 * levels the post uses (a post may start at h3), marks the section being read, and fills
 * a bar as the post is read. Lists of fewer than two entries aren't worth showing.
 */
export function PostToc({ items, label }: { items: TocItem[]; label: string }) {
  const levels = [...new Set(items.map((it) => it.depth))].sort().slice(0, 2);
  const shown = items
    .filter((it) => levels.includes(it.depth))
    .map((it, i, all) => {
      const sub = it.depth !== levels[0];
      const own = ownNumber(it.text);
      const count = all.slice(0, i + 1).filter((x) => x.depth === levels[0]).length;
      const no = own ? String(own.n).padStart(sub ? 1 : 2, "0") : sub ? "·" : String(count).padStart(2, "0");
      return { ...it, sub, no, text: own?.rest ?? it.text };
    });
  const ids = shown.map((it) => it.id).join(" ");
  const [active, setActive] = useState<string | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pct = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ids.includes(" ")) return;
    const headings = ids
      .split(" ")
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const article = headings[0]?.closest("article");
    let frame = 0;
    const update = () => {
      frame = 0;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      let current: string | null = null;
      for (const el of headings) {
        if (el.getBoundingClientRect().top > LINE) break;
        current = el.id;
      }
      setActive(atEnd ? (headings.at(-1)?.id ?? current) : current);
      if (article) {
        const r = article.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight)));
        bar.current!.style.transform = `scaleX(${p})`;
        pct.current!.textContent = `${String(Math.round(p * 100)).padStart(3, "0")}%`;
      }
    };
    const schedule = () => {
      frame ||= requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [ids]);

  // Keep the marked entry in view when the list scrolls on its own.
  useEffect(() => {
    const box = list.current;
    const item = box?.querySelector<HTMLElement>("[aria-current]");
    if (!box || !item) return;
    if (item.offsetTop < box.scrollTop + 24 || item.offsetTop + item.offsetHeight > box.scrollTop + box.clientHeight - 24) {
      box.scrollTo({ top: item.offsetTop - box.clientHeight / 3, behavior: prefersReducedMotion() ? "instant" : "smooth" });
    }
  }, [active]);

  if (shown.length < 2) return null;

  const go = (event: React.MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    event.preventDefault();
    const y = el.getBoundingClientRect().top + window.scrollY - 96;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(y, { duration: 0.7 });
    else window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "instant" : "smooth" });
  };

  return (
    <nav aria-label={label} className="post-side post-toc">
      <div className="side-panel">
        <p className="label flex items-center justify-between gap-3 border-b border-ink px-3 py-2">
          <span>{label}</span>
          <span ref={pct} className="tabular-nums text-accent">
            000%
          </span>
        </p>
        <ol ref={list} className="side-scroll py-1.5" data-lenis-prevent>
          {shown.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                onClick={(e) => go(e, it.id)}
                aria-current={active === it.id ? "location" : undefined}
                className={`side-link ${it.sub ? "side-link-sub" : ""}`}
              >
                <span className="side-no">{it.no}</span>
                <span>{it.text}</span>
              </a>
            </li>
          ))}
        </ol>
        <span aria-hidden className="block h-[3px] border-t border-ink bg-paper">
          <span ref={bar} className="block h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
        </span>
      </div>
    </nav>
  );
}
