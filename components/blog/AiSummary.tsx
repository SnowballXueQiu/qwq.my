import type { Locale } from "@/lib/i18n";

/**
 * The AI summary at the head of a post. It types itself out once, a word at a time, as
 * the sheet is drawn in. CSS only: the whole text is in the page from the start, so
 * readers without animation (or without JavaScript) simply see it.
 */
export function AiSummary({ text, lang, label }: { text: string; lang: Locale; label: string }) {
  const words = [...new Intl.Segmenter(lang, { granularity: "word" }).segment(text)].map((s) => s.segment);
  // The whole text takes about 1.8s, whatever its length.
  const step = Math.min(40, 1800 / words.length);
  return (
    <aside aria-label={label} className="relative mt-8 border border-ink bg-paper/90">
      <span aria-hidden className="absolute -left-1 -top-1 size-2 border-l border-t border-accent" />
      <p className="label flex items-center gap-1.5 border-b border-ink px-3 py-1.5 text-accent">
        <svg aria-hidden viewBox="0 0 12 12" className="h-[0.9em] w-[0.9em]" fill="currentColor">
          <path d="M6 0 7.3 4.7 12 6 7.3 7.3 6 12 4.7 7.3 0 6 4.7 4.7Z" />
        </svg>
        {label}
      </p>
      <p lang={lang === "zh" ? "zh-CN" : "en"} className="ai-summary px-4 py-3" style={{ "--step": `${step.toFixed(1)}ms` } as React.CSSProperties}>
        {words.map((word, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            {word}
          </span>
        ))}
      </p>
    </aside>
  );
}
