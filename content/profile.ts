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
  bio: [
    {
      zh: "喜欢把想法做成能跑起来、能用起来的东西。网页、原生 App、后端、我的世界服务器和插件都在做，也在用 AI 工具把原型做得更快。",
      en: "I like turning ideas into things that run and get used: web, native apps, backends, Minecraft servers and plugins, with AI tools to prototype faster.",
    },
    {
      zh: "联合创立了瀚海工艺，在苦力怕论坛管技术，给《Rust 语言圣经》写内容。这个网站本身就是一张还在修订的图纸。",
      en: "I co-founded Vastsea, run tech at KLPBBS, and write for the Rust Course. This site is itself a drawing still under revision.",
    },
  ] satisfies L10n[],
  avatar: "/media/avatar.jpg",
  /** What I'm doing now. */
  now: [
    {
      org: { zh: "瀚海工艺 Vastsea", en: "Vastsea" },
      role: { zh: "联合创始人", en: "Co-founder" },
      href: "https://github.com/TeamVastsea",
      logo: "/media/logos/vastsea.svg",
    },
    {
      org: { zh: "苦力怕论坛 KLPBBS", en: "KLPBBS (Creeper Forum)" },
      role: { zh: "技术总管 & 版主", en: "Head of tech & moderator" },
      href: "https://klpbbs.com",
      logo: "/media/logos/klpbbs.png",
    },
    {
      org: { zh: "course.rs《Rust 语言圣经》", en: "course.rs (The Rust Course)" },
      role: { zh: "协作者", en: "Collaborator" },
      href: "https://course.rs",
      logo: "/media/logos/course-rs.png",
    },
    {
      org: { zh: "Inf Network", en: "Inf Network" },
      role: { zh: "我的世界服务器服主（重建中…）", en: "Minecraft server owner (rebuilding…)" },
      href: "https://github.com/Inf-Network",
      logo: "/media/logos/inf-network.png",
    },
    {
      org: { zh: "MCSL2", en: "MCSL2" },
      role: { zh: "我的世界开服器 · 后端开发", en: "Minecraft server launcher · backend" },
      href: "https://github.com/MCSLTeam/MCSL2",
      logo: "/media/logos/mcsl2.png",
    },
  ] satisfies { org: L10n; role: L10n; href: string; logo?: string }[],
  email: "snowballstudio233@gmail.com",
  /** `href` opens it; `copy` puts the handle on the clipboard instead (no public URL). */
  contacts: [
    { label: "Email", value: "snowballstudio233@gmail.com", href: "mailto:snowballstudio233@gmail.com" },
    { label: "GitHub", value: "SnowballXueQiu", href: "https://github.com/SnowballXueQiu" },
    { label: "Telegram", value: "@Snowball_233", href: "https://t.me/Snowball_233" },
    { label: "Discord", value: "SnowballXueQiu", copy: true },
    { label: "QQ", value: "2957202260", copy: true },
    // Same-site path: the proxy sends /blog to the visitor's language.
    { label: "Blog", value: "qwq.my/blog", href: "/blog" },
  ] as { label: string; value: string; href?: string; copy?: boolean }[],
};
