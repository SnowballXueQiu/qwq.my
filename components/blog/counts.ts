import type { Locale } from "@/lib/i18n";

/** "{n} views" style labels, singular and plural, from messages/<locale>.json (blog). */
export type CountLabels = { viewsOne: string; viewsOther: string; likesOne: string; likesOther: string };

/** 1,234 · 1.2万 / 12K once a count gets long. */
export function formatCount(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en", {
    notation: n >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(n);
}

/** "1,234 次阅读", "1 like"; a dash while the count is still on its way. */
export function countText(n: number | null, kind: "views" | "likes", labels: CountLabels, locale: Locale) {
  const pattern = n === 1 ? labels[`${kind}One`] : labels[`${kind}Other`];
  return pattern.replace("{n}", n === null ? "—" : formatCount(n, locale));
}
