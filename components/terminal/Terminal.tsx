"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { lockScroll } from "@/lib/scroll";
import type { PostMeta } from "@/lib/postTypes";
import { complete, run, setPostSlugs, type Line } from "./commands";

const PROMPT = "visitor@qwq.my:~$";

const greeting = (locale: Locale): Line[] => [
  { kind: "accent", text: "qwqsh 0.1 — (◉w◉)" },
  { kind: "out", text: locale === "zh" ? "输入 help 查看命令。" : "type help for commands." },
];

/** A drop-down shell over the scene. ` or ⌘K toggles it. */
export function Terminal({ locale, posts }: { locale: Locale; posts: PostMeta[] }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(() => greeting(locale));
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => setPostSlugs(posts.map((p) => p.slug)), [posts]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]");
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "`" && !typing)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("qwq:terminal", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("qwq:terminal", onOpen);
    };
  }, []);

  useEffect(() => {
    lockScroll(open);
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [lines]);

  const submit = async () => {
    const command = value;
    setValue("");
    cursor.current = -1;
    setLines((l) => [...l, { kind: "in", text: `${PROMPT} ${command}` }]);
    if (!command.trim()) return;
    history.current = [...history.current, command];
    setBusy(true);
    await run(command, {
      locale,
      history: history.current,
      posts,
      print: (...out) => setLines((l) => [...l, ...out.map((o) => (typeof o === "string" ? { kind: "out" as const, text: o } : o))]),
      clear: () => setLines([]),
      close,
      navigate: (href) => {
        close();
        router.push(href);
      },
    });
    setBusy(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!busy) void submit();
    } else if (e.key === "Tab") {
      e.preventDefault();
      const next = complete(value);
      if (next) setValue(next);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const h = history.current;
      if (!h.length) return;
      cursor.current =
        e.key === "ArrowUp"
          ? Math.min(h.length - 1, cursor.current + 1)
          : Math.max(-1, cursor.current - 1);
      setValue(cursor.current < 0 ? "" : h[h.length - 1 - cursor.current]);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  const color: Record<Line["kind"], string> = {
    in: "text-[#f1ede4]",
    out: "text-[#f1ede4]/75",
    err: "text-[#e8402a]",
    ok: "text-[#f1ede4]",
    accent: "text-[#e8402a]",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Terminal"
      aria-hidden={!open}
      className={`fixed inset-0 z-[80] flex items-start justify-center bg-[#141414]/55 pt-[12vh] backdrop-blur-[1px] transition-opacity duration-200 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={`w-[min(760px,92vw)] border border-[#f1ede4]/40 bg-[#141414] font-mono text-[13px] text-[#f1ede4] shadow-[8px_8px_0_#e8402a] transition-transform duration-300 ${
          open ? "translate-y-0" : "-translate-y-6"
        }`}
        onClick={() => input.current?.focus()}
      >
        <div className="flex items-center justify-between border-b border-[#f1ede4]/25 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-[#f1ede4]/60">
          <span>qwqsh — {PROMPT}</span>
          <button type="button" onClick={close} className="hover:text-[#e8402a]" aria-label="Close terminal">
            esc ✕
          </button>
        </div>
        <div ref={scroller} className="h-[52vh] overflow-y-auto px-3 py-2" data-lenis-prevent>
          {lines.map((line, i) => (
            <pre key={i} className={`whitespace-pre-wrap break-words leading-5 ${color[line.kind]}`}>
              {line.text}
            </pre>
          ))}
          <label className="flex items-center gap-2 leading-5">
            <span className="shrink-0 text-[#e8402a]">{PROMPT}</span>
            <input
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKeyDown}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              aria-label="Command"
              className="min-w-0 flex-1 bg-transparent caret-[#e8402a] outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
