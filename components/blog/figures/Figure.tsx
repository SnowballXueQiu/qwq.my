/** Picks the reader's language for a figure's own labels. */
export type Lang = "zh" | "en";
export const tr = (lang: Lang, zh: string, en: string) => (lang === "zh" ? zh : en);

/** A numbered plate: the figure itself, then "FIG. 03 — caption" under it. */
export function Figure({
  n,
  caption,
  wide = false,
  children,
}: {
  n: string;
  caption: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className={`fig ${wide ? "fig-wide" : ""}`}>
      <div className="border border-ink bg-paper">{children}</div>
      <figcaption className="mt-2 flex gap-3 text-[0.85rem] leading-relaxed text-ink-soft">
        <span className="label shrink-0 pt-[0.2em] text-accent">FIG. {n}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}
