import type { L10n } from "@/lib/i18n";

export type TimelineEvent = {
  date: string; // YYYY-MM
  kind: "school" | "project" | "award" | "work" | "life";
  title: L10n;
  detail: L10n;
};

// 占位内容：DNA 螺旋的每一级横档就是一条经历，按时间排序。
export const timeline: TimelineEvent[] = [
  {
    date: "2020-09",
    kind: "life",
    title: { zh: "写下第一行代码", en: "First line of code" },
    detail: { zh: "用 Python 写了一个猜数字游戏。", en: "A number-guessing game in Python." },
  },
  {
    date: "2022-07",
    kind: "project",
    title: { zh: "第一个开源项目", en: "First open-source project" },
    detail: { zh: "在 GitHub 上收到了第一颗星。", en: "Got the first star on GitHub." },
  },
  {
    date: "2024-09",
    kind: "school",
    title: { zh: "进入大学", en: "Started university" },
    detail: { zh: "计算机科学与技术专业。", en: "Majoring in Computer Science." },
  },
  {
    date: "2025-05",
    kind: "award",
    title: { zh: "某某竞赛获奖", en: "Placeholder contest award" },
    detail: { zh: "和队友熬了三个通宵。", en: "Three all-nighters with the team." },
  },
  {
    date: "2026-11",
    kind: "project",
    title: { zh: "qwq.my 上线", en: "qwq.my goes live" },
    detail: { zh: "就是你正在看的这张图纸。", en: "The drawing you're looking at." },
  },
];
