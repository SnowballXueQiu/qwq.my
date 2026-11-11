import type { L10n } from "@/lib/i18n";

/** Deterministic placeholder contribution counts until real data is fetched. */
function placeholderContributions(seed: number) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 371 }, (_, i) => {
    const weekday = i % 7;
    const busy = 0.35 + 0.35 * Math.sin(i / 40) + (weekday === 0 || weekday === 6 ? -0.2 : 0.1);
    return r() < busy ? Math.floor(r() * 12 * busy) + 1 : 0;
  });
}

// 占位数据：之后可以用 scripts/fetch-github-stats.ts 拉真实的 GitHub 数据。
export const year2026 = {
  year: 2026,
  stats: [
    { key: "commits", value: 1287, label: { zh: "次提交", en: "commits" } satisfies L10n },
    { key: "repos", value: 23, label: { zh: "个新仓库", en: "new repos" } satisfies L10n },
    { key: "shaders", value: 42, label: { zh: "个 shader", en: "shaders" } satisfies L10n },
    { key: "coffee", value: 365, label: { zh: "杯咖啡", en: "coffees" } satisfies L10n },
  ],
  /** One number per day, Sunday-first weeks, 53 columns × 7 rows. */
  contributions: placeholderContributions(2026),
  highlights: [
    { zh: "进入大学的第三个学期", en: "Third semester at university" },
    { zh: "第一次在比赛里拿奖", en: "First contest award" },
    { zh: "写了 42 个 shader，其中 3 个能看", en: "42 shaders written, 3 of them good" },
    { zh: "qwq.my 上线", en: "qwq.my went live" },
  ] satisfies L10n[],
};

export type YearData = typeof year2026;
