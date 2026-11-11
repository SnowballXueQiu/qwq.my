import type { L10n } from "@/lib/i18n";

// 占位内容：把这里换成你自己的信息即可，全站会自动更新。
export const profile = {
  name: { zh: "雪球", en: "Snowball" } satisfies L10n,
  handle: "SnowballXueQiu",
  roles: { zh: "学生 / 开发者", en: "Student / Developer" } satisfies L10n,
  school: { zh: "某某大学", en: "Placeholder University" } satisfies L10n,
  major: { zh: "计算机科学与技术", en: "Computer Science" } satisfies L10n,
  grade: { zh: "本科二年级", en: "Sophomore" } satisfies L10n,
  location: { zh: "中国", en: "China" } satisfies L10n,
  bio: [
    {
      zh: "我是雪球，一名喜欢把想法做成能跑起来的东西的学生开发者。白天上课、做实验，晚上写代码、折腾 shader。",
      en: "I'm Snowball, a student developer who likes turning ideas into things that actually run. Lectures and labs by day; code and shaders by night.",
    },
    {
      zh: "我关心交互的手感、渲染的细节，以及代码读起来是否舒服。这个网站本身就是一张还在修订的图纸。",
      en: "I care about how interactions feel, how pixels are rendered, and whether code reads well. This site is itself a drawing still under revision.",
    },
  ] satisfies L10n[],
  email: "hi@qwq.my",
  links: [
    { label: "GitHub", href: "https://github.com/SnowballXueQiu" },
    { label: "Email", href: "mailto:hi@qwq.my" },
  ],
};
