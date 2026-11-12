import type { L10n } from "@/lib/i18n";

// 改这里，全站自动更新。
export const profile = {
  name: { zh: "雪球", en: "Snowball_233" } satisfies L10n,
  handle: "SnowballXueQiu",
  roles: { zh: "学生 / 开发者", en: "Student / Developer" } satisfies L10n,
  school: { zh: "天津师范大学", en: "Tianjin Normal University" } satisfies L10n,
  major: { zh: "人工智能", en: "Artificial Intelligence" } satisfies L10n,
  grade: { zh: "2025 级", en: "Class of 2025" } satisfies L10n,
  location: { zh: "中国", en: "China" } satisfies L10n,
  /** Where the pin goes on the About globe (Tianjin). */
  geo: { lat: 39.1, lon: 117.2 },
  bio: [
    {
      zh: "我是雪球（Snowball_233），天津师范大学人工智能专业 2025 级的学生，也是一个喜欢把想法做成能跑起来的东西的开发者。",
      en: "I'm Snowball (Snowball_233), an Artificial Intelligence student at Tianjin Normal University, class of 2025, and a developer who likes turning ideas into things that run.",
    },
    {
      zh: "从网页、原生 App 到后端和 Minecraft 插件都写过一点，最近在折腾 shader 和 LLM 工具链。这个网站本身就是一张还在修订的图纸。",
      en: "I've written a bit of everything from web and native apps to backends and Minecraft plugins, and lately I'm into shaders and LLM tooling. This site is itself a drawing still under revision.",
    },
  ] satisfies L10n[],
  email: "hi@qwq.my",
  links: [
    { label: "GitHub", href: "https://github.com/SnowballXueQiu" },
    { label: "Blog", href: "https://blog.qwq.my" },
    { label: "Email", href: "mailto:hi@qwq.my" },
  ],
};
