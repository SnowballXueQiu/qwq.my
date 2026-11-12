import type { L10n } from "@/lib/i18n";
import type { GithubData } from "@/lib/githubFetch";
import snapshot from "@/content/github.json";

/**
 * Data for the year-in-review film, built from GitHub (live on the site,
 * the committed snapshot when rendering offline) plus hand-written highlights.
 */
export function buildYearData(github: GithubData) {
  return {
    year: 2026,
    stats: [
      { key: "contributions", value: github.total, label: { zh: "次贡献 · 近一年", en: "contributions · last year" } satisfies L10n },
      { key: "repos", value: github.repos, label: { zh: "个公开仓库", en: "public repos" } satisfies L10n },
      { key: "followers", value: github.followers, label: { zh: "位关注者", en: "followers" } satisfies L10n },
      { key: "classes", value: 14, label: { zh: "次授课 × 90 分钟", en: "classes taught × 90 min" } satisfies L10n },
    ],
    /** One number per day, Sunday-first weeks, oldest first. */
    contributions: github.weeks.flatMap((w) => w.map((d) => d.count)),
    highlights: [
      { zh: "歆云教育科技 · 全栈开发实习", en: "Full-stack intern at Xinyun Education Technology" },
      { zh: "受邀为海南比勒费尔德应用科学大学授课", en: "Invited to teach at Hainan Bielefeld University of Applied Sciences" },
      { zh: "指导 10 篇学生 IEEE 格式课程论文", en: "Supervised 10 student papers in IEEE format" },
      { zh: "qwq.my 上线", en: "qwq.my went live" },
    ] satisfies L10n[],
  };
}

export const year2026 = buildYearData(snapshot as GithubData);

export type YearData = ReturnType<typeof buildYearData>;
