import { sheets } from "./sheets";

/**
 * Scene time: a float where the integer part is the sheet index and the fraction
 * is how far the page has scrolled through that sheet. 0 = top of the hero,
 * 1 = top of "about", and so on. The 3D director keys everything off this.
 */
type Span = { top: number; height: number };

let spans: Span[] = [];
let measured = false;

export function measureSheets() {
  const scrollY = window.scrollY;
  spans = sheets.map((id) => {
    const el = document.querySelector<HTMLElement>(`[data-sheet="${id}"]`);
    if (!el) return { top: Infinity, height: 1 };
    const rect = el.getBoundingClientRect();
    return { top: rect.top + scrollY, height: Math.max(rect.height, 1) };
  });
  measured = spans.some((s) => Number.isFinite(s.top));
}

export function getSceneTime(): number {
  if (typeof window === "undefined" || !measured) return 0;
  const y = window.scrollY;
  for (let i = spans.length - 1; i >= 0; i--) {
    const s = spans[i];
    if (y >= s.top) return i + Math.min((y - s.top) / s.height, 1);
  }
  return 0;
}

/** Whether the home page's sheets are on screen (false on blog/project pages). */
export const hasSheets = () => measured;

export function clearSheets() {
  spans = [];
  measured = false;
}
