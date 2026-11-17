import type { L10n } from "@/lib/i18n";

/**
 * Every tag a post can carry. A post's frontmatter lists ids from here (`tags: [math, physics]`);
 * an id that isn't here fails the build, so the list stays the only place tags are made.
 * The order here is the order of the tag bar on the blog index.
 */
export const tags = {
  ai: { zh: "AI", en: "AI" },
  code: { zh: "编程", en: "Programming" },
  graphics: { zh: "图形学", en: "Graphics" },
  site: { zh: "建站", en: "This site" },
  server: { zh: "服务器", en: "Servers" },
  linux: { zh: "Linux", en: "Linux" },
  minecraft: { zh: "Minecraft", en: "Minecraft" },
  "open-source": { zh: "开源", en: "Open source" },
  math: { zh: "数学", en: "Math" },
  physics: { zh: "物理", en: "Physics" },
  biology: { zh: "生物", en: "Biology" },
  essay: { zh: "杂谈", en: "Essays" },
  life: { zh: "生活", en: "Life" },
  photos: { zh: "图集", en: "Photos" },
} satisfies Record<string, L10n>;

export type TagId = keyof typeof tags;

export const tagIds = Object.keys(tags) as TagId[];

export const isTag = (id: string): id is TagId => Object.hasOwn(tags, id);
