import type { L10n } from "@/lib/i18n";
import type { GithubData } from "@/lib/githubFetch";
import snapshot from "@/content/github.json";

/** Simple facts read straight off the contribution calendar. */
function calendarFacts(github: GithubData) {
  const days = github.weeks.flat();
  let best = days[0] ?? { date: "", count: 0 };
  let streak = 0;
  let longest = 0;
  for (const d of days) {
    if (d.count > best.count) best = d;
    streak = d.count > 0 ? streak + 1 : 0;
    longest = Math.max(longest, streak);
  }
  return { best, longest, active: days.filter((d) => d.count > 0).length, total: days.length };
}

/**
 * Data for the year-in-review film, all of it from GitHub (live on the site,
 * the committed snapshot when rendering offline).
 */
export function buildYearData(github: GithubData) {
  const f = calendarFacts(github);
  const repos = github.contributedTo.length + github.otherRepos;
  const names = github.contributedTo.map((r) => r.split("/")[1]).join("、");
  return {
    year: 2026,
    stats: [
      { key: "contributions", value: github.total, label: { zh: "次贡献 · 近一年", en: "contributions · last year" } satisfies L10n },
      { key: "touched", value: repos, label: { zh: "个参与过的仓库", en: "repositories contributed to" } satisfies L10n },
      { key: "repos", value: github.repos, label: { zh: "个公开仓库", en: "public repos" } satisfies L10n },
      { key: "followers", value: github.followers, label: { zh: "位关注者", en: "followers" } satisfies L10n },
    ],
    /** One number per day, Sunday-first weeks, oldest first. */
    contributions: github.weeks.flatMap((w) => w.map((d) => d.count)),
    highlights: [
      { zh: `最忙的一天：${f.best.date}，${f.best.count} 次贡献`, en: `Busiest day: ${f.best.date}, ${f.best.count} contributions` },
      { zh: `最长连续：${f.longest} 天`, en: `Longest streak: ${f.longest} days` },
      { zh: `活跃天数：${f.active} / ${f.total}`, en: `Active days: ${f.active} / ${f.total}` },
      {
        zh: `参与了 ${repos} 个仓库：${names} 等`,
        en: `Contributed to ${repos} repositories, incl. ${github.contributedTo.map((r) => r.split("/")[1]).join(", ")}`,
      },
    ] satisfies L10n[],
  };
}

export const year2026 = buildYearData(snapshot as GithubData);

export type YearData = ReturnType<typeof buildYearData>;
