import type { L10n } from "@/lib/i18n";

export type TimelineKind = "found" | "project" | "work" | "award" | "school" | "teach";

export type TimelineMedia =
  | { type: "certificates"; images: { src: L10n; alt: L10n }[] }
  | { type: "teaching"; src: string; alt: L10n; stats: { value: string; label: L10n }[] };

export type TimelineEvent = {
  date: string; // YYYY-MM, for ordering
  /** Shown instead of the date when the month isn't the point (e.g. "2026 秋"). */
  /** An organisation logo for the roadside sign. `dark` puts light artwork on a dark plate. */
  logo?: { src: string; alt: L10n; dark?: boolean };
  when?: L10n;
  kind: TimelineKind;
  title: L10n;
  detail: L10n;
  media?: TimelineMedia;
};

const cert = (name: string) => ({ zh: `/media/awards/${name}-zh.jpg`, en: `/media/awards/${name}-en.jpg` });

// 经历公路上的路标，按时间排序。
export const timeline: TimelineEvent[] = [
  {
    date: "2021-09",
    kind: "found",
    title: { zh: "联合创立瀚海工艺技术团队", en: "Co-founded the Vastsea tech team" },
    detail: { zh: "瀚海工艺 Vastsea，做下一代轨道交通主题的我的世界服务器。", en: "Vastsea: a next-gen rail-transit Minecraft server." },
    logo: { src: "/media/logos/vastsea.svg", alt: { zh: "瀚海工艺", en: "Vastsea" } },
  },
  {
    date: "2024-08",
    kind: "project",
    title: { zh: "成为《Rust 语言圣经》协作者", en: "Joined the Rust Course as a collaborator" },
    detail: { zh: "给 course.rs 补全和修订内容。", en: "Filling in and revising chapters of course.rs." },
    logo: { src: "/media/logos/course-rs.png", alt: { zh: "《Rust 语言圣经》", en: "The Rust Course" } },
  },
  {
    date: "2024-09",
    kind: "project",
    title: { zh: "发布 sb.h", en: "Released sb.h" },
    detail: { zh: "一个整活头文件，意外收获 350+ Star。", en: "A joke header that somehow got 350+ stars." },
  },
  {
    date: "2024-11",
    kind: "work",
    title: { zh: "苦力怕论坛技术总管", en: "Head of tech at KLPBBS" },
    detail: { zh: "徐州驰飞互联网科技有限公司。", en: "Xuzhou Chifei Internet Technology Co., Ltd." },
    logo: { src: "/media/logos/klpbbs.png", alt: { zh: "苦力怕论坛", en: "KLPBBS" } },
  },
  {
    date: "2025-07",
    kind: "award",
    title: { zh: "AdventureX 黑客松 三等奖 + 优秀奖", en: "AdventureX hackathon: Third Prize + Excellence Award" },
    detail: {
      zh: "项目 Counter-Strike Market Arbitrage。Kimi For Vibe Coding 赛道三等奖，共享算力赛道优秀奖。",
      en: "Project: Counter-Strike Market Arbitrage. Third Prize in the Kimi For Vibe Coding track, Excellence Award in Shared Computing Power.",
    },
    media: {
      type: "certificates",
      images: [
        { src: cert("adventurex-third"), alt: { zh: "AdventureX 2025 三等奖证书", en: "AdventureX 2025 Third Prize certificate" } },
        {
          src: cert("adventurex-excellence"),
          alt: { zh: "AdventureX 2025 优秀奖证书", en: "AdventureX 2025 Excellence Award certificate" },
        },
      ],
    },
  },
  {
    date: "2025-09",
    kind: "school",
    title: { zh: "进入天津师范大学", en: "Started at Tianjin Normal University" },
    detail: { zh: "人工智能专业，2025 级。", en: "Artificial Intelligence, class of 2025." },
    logo: { src: "/media/logos/tjnu.png", alt: { zh: "天津师范大学", en: "Tianjin Normal University" }, dark: true },
  },
  {
    date: "2025-10",
    kind: "work",
    title: { zh: "北京医索科技 · 前端开发实习", en: "Frontend intern at Sciland" },
    detail: {
      zh: "Sciland（原 MedgeAI）：自进化 AI 科研工作空间。",
      en: "Sciland (formerly MedgeAI), a self-evolving AI research workspace.",
    },
  },
  {
    date: "2025-11",
    kind: "work",
    title: { zh: "歆云教育科技 · 全栈开发实习", en: "Full-stack intern at Xinyun Education Technology" },
    detail: { zh: "全栈开发实习。", en: "Full-stack development internship." },
  },
  {
    date: "2026-10",
    when: { zh: "2026.10.26", en: "2026.10.26" },
    kind: "teach",
    title: { zh: "受邀为海南比勒费尔德应用科学大学授课", en: "Invited to teach at Hainan Bielefeld University of Applied Sciences" },
    detail: {
      zh: "AI 辅助编程与技术原型开发（B111），面向软件工程大一；独立设计课程与课件，带学生用 IEEE 格式写原型论文。",
      en: "AI-assisted programming and prototyping (B111) for first-year Software Engineering; I designed the course, and students wrote up prototypes as IEEE papers.",
    },
    media: {
      type: "teaching",
      src: "/media/teaching-papers.webp",
      alt: { zh: "学生课程论文（作者信息已模糊）", en: "Student course papers (author details blurred)" },
      stats: [
        { value: "14", label: { zh: "次课 × 90 分钟", en: "classes × 90 min" } },
        { value: "10", label: { zh: "篇学生论文", en: "student papers" } },
        { value: "64", label: { zh: "页成果", en: "pages" } },
      ],
    },
  },
  {
    date: "2026-11",
    kind: "project",
    title: { zh: "qwq.my 上线", en: "qwq.my goes live" },
    detail: { zh: "就是你正在看的这张图纸。", en: "The drawing you're looking at." },
  },
];

export const KIND_LABEL: Record<TimelineKind, L10n> = {
  found: { zh: "创立", en: "Founded" },
  project: { zh: "项目", en: "Project" },
  work: { zh: "实习 · 工作", en: "Work" },
  award: { zh: "获奖", en: "Award" },
  school: { zh: "求学", en: "School" },
  teach: { zh: "授课", en: "Teaching" },
};

/** The label for an event's date, in the page language. */
export const whenLabel = (e: TimelineEvent, locale: "zh" | "en") => e.when?.[locale] ?? e.date.replace("-", ".");
