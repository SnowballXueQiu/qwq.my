import type { L10n } from "@/lib/i18n";

export type TimelineEvent = {
  date: string; // YYYY-MM
  kind: "school" | "project" | "award" | "work" | "life";
  title: L10n;
  detail: L10n;
};

// 经历公路上的路标，按时间排序。
export const timeline: TimelineEvent[] = [
  {
    date: "2024-08",
    kind: "project",
    title: { zh: "成为《Rust 语言圣经》协作者", en: "Joined the Rust Course as a collaborator" },
    detail: { zh: "给 course.rs 补全和修订内容。", en: "Filling in and revising chapters of course.rs." },
  },
  {
    date: "2024-08",
    kind: "project",
    title: { zh: "苦力怕论坛问卷系统前端", en: "KLPBBS survey frontend" },
    detail: { zh: "和 TeamVastsea 一起做，跑在 wj.klpbbs.com。", en: "With TeamVastsea, running at wj.klpbbs.com." },
  },
  {
    date: "2024-09",
    kind: "project",
    title: { zh: "发布 sb.h", en: "Released sb.h" },
    detail: { zh: "一个整活头文件，意外收获 350+ Star。", en: "A joke header that somehow got 350+ stars." },
  },
  {
    date: "2025-09",
    kind: "school",
    title: { zh: "进入天津师范大学", en: "Started at Tianjin Normal University" },
    detail: { zh: "人工智能专业，2025 级。", en: "Artificial Intelligence, class of 2025." },
  },
  {
    date: "2025-10",
    kind: "project",
    title: { zh: "SignInPlus 签到插件", en: "SignInPlus check-in plugin" },
    detail: { zh: "用 Kotlin 写的 Spigot 插件，我是主要作者。", en: "A Kotlin plugin for Spigot servers; I'm the lead author." },
  },
  {
    date: "2026-11",
    kind: "project",
    title: { zh: "qwq.my 上线", en: "qwq.my goes live" },
    detail: { zh: "就是你正在看的这张图纸。", en: "The drawing you're looking at." },
  },
];
