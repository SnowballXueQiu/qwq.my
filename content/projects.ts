import type { L10n } from "@/lib/i18n";

export type Project = {
  slug: string;
  title: string;
  year: number;
  summary: L10n;
  /** My part in it. */
  role: L10n;
  tags: string[];
  href?: string;
  repo?: string;
};

export const projects: Project[] = [
  {
    slug: "qwq-my",
    title: "qwq.my",
    year: 2026,
    summary: {
      zh: "这个网站：一张会被撕开的图纸，后面是一个可以玩的 3D 世界。",
      en: "This site: a drawing that tears open onto a 3D world you can play with.",
    },
    role: { zh: "作者", en: "Author" },
    tags: ["Next.js", "Three.js", "Remotion"],
    href: "https://qwq.my",
    repo: "https://github.com/SnowballXueQiu/qwq.my",
  },
  {
    slug: "sb-h",
    title: "sb.h",
    year: 2024,
    summary: {
      zh: "让你的 C++ 代码秒变「优秀」：把 mian、retrun、stadout 这些经典手误写成宏的整活头文件，350+ Star。",
      en: "Makes your C++ instantly \"excellent\": a joke header that turns classic typos like mian, retrun and stadout into macros. 350+ stars.",
    },
    role: { zh: "作者", en: "Author" },
    tags: ["C++", "Meme"],
    repo: "https://github.com/SnowballXueQiu/sb.h",
  },
  {
    slug: "klpbbs-survey",
    title: "KLPBBS Survey",
    year: 2024,
    summary: {
      zh: "苦力怕论坛问卷系统的前端，在 wj.klpbbs.com 上线运行。",
      en: "Frontend of the KLPBBS (Creeper forum) survey system, live at wj.klpbbs.com.",
    },
    role: { zh: "前端开发", en: "Frontend" },
    tags: ["Next.js", "React", "Mantine"],
    href: "https://wj.klpbbs.com",
    repo: "https://github.com/TeamVastsea/klpbbs_survey_frontend",
  },
  {
    slug: "rust-course",
    title: "Rust Course",
    year: 2024,
    summary: {
      zh: "《Rust 语言圣经》course.rs，3 万多 Star 的中文 Rust 教程，我是协作者之一。",
      en: "course.rs, the Chinese Rust book with 30k+ stars; I'm one of its collaborators.",
    },
    role: { zh: "教程协作者", en: "Collaborator" },
    tags: ["Rust", "Docs"],
    href: "https://course.rs",
    repo: "https://github.com/sunface/rust-course",
  },
  {
    slug: "signinplus",
    title: "SignInPlus",
    year: 2025,
    summary: {
      zh: "Spigot 服务器签到插件：每日签到、连签统计、补签卡、排行榜、积分经济、PlaceholderAPI 和 Web API。",
      en: "A check-in plugin for Spigot servers: daily sign-ins, streaks, make-up cards, rankings, a points economy, PlaceholderAPI and a Web API.",
    },
    role: { zh: "主要作者", en: "Lead author" },
    tags: ["Kotlin", "Minecraft"],
    repo: "https://github.com/TeamVastsea/SignInPlus",
  },
];
