import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getFrontmatter } from "next-mdx-remote-client/utils";
import { isTag, tagIds, type TagId } from "@/content/tags";
import { locales, type Locale } from "./i18n";
import type { PostMeta } from "./postTypes";

export type { PostMeta };

type Frontmatter = { title?: string; date?: string | Date; summary?: string; tags?: string[]; aigc?: boolean };

const ROOT = path.join(process.cwd(), "content", "posts");

async function readSource(slug: string, locale: Locale) {
  // Prefer the requested language, then any other one we have.
  for (const lang of [locale, ...locales.filter((l) => l !== locale)]) {
    try {
      const source = await readFile(path.join(ROOT, slug, `${lang}.mdx`), "utf8");
      return { source, lang };
    } catch {}
  }
  return null;
}

function toMeta(slug: string, lang: Locale, fm: Frontmatter): PostMeta {
  const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? "");
  const tags = (fm.tags ?? []).map(String);
  // Tags come from content/tags.ts only; a typo or a new one made up in a post stops the build.
  const unknown = tags.filter((t) => !isTag(t));
  if (unknown.length) throw new Error(`${slug}/${lang}.mdx: unknown tag ${unknown.join(", ")} (add it to content/tags.ts)`);
  return { slug, lang, date, title: fm.title ?? slug, summary: fm.summary ?? "", tags: tags as TagId[], aigc: fm.aigc === true };
}

export async function listPosts(locale: Locale): Promise<PostMeta[]> {
  "use cache";
  const slugs = (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  const posts = await Promise.all(
    slugs.map(async (slug) => {
      const found = await readSource(slug, locale);
      if (!found) return null;
      const { frontmatter } = getFrontmatter<Frontmatter>(found.source);
      return toMeta(slug, found.lang, frontmatter);
    }),
  );
  return posts.filter((p): p is PostMeta => p !== null).sort((a, b) => b.date.localeCompare(a.date));
}

/** Tags in use, in content/tags.ts order, with how many posts carry each. */
export async function listTags(locale: Locale): Promise<{ id: TagId; count: number }[]> {
  "use cache";
  const posts = await listPosts(locale);
  return tagIds
    .map((id) => ({ id, count: posts.filter((p) => p.tags.includes(id)).length }))
    .filter((t) => t.count > 0);
}

/**
 * The AI summary of a post, if it has one (content/posts/<slug>/summary.json; kept current
 * with `pnpm summaries`). Entries are keyed by the language of the text that was read, and
 * hold the summary in each language it was written in.
 */
async function readSummary(slug: string, lang: Locale, locale: Locale) {
  try {
    const file: Partial<Record<Locale, { text?: Partial<Record<Locale, string>> }>> = JSON.parse(
      await readFile(path.join(ROOT, slug, "summary.json"), "utf8"),
    );
    const text = file[lang]?.text;
    const shown = text?.[locale] ? locale : text?.[lang] ? lang : null;
    return shown ? { text: text![shown]!, lang: shown } : null;
  } catch {
    return null;
  }
}

export async function getPost(slug: string, locale: Locale) {
  "use cache";
  const found = await readSource(slug, locale);
  if (!found) return null;
  const { frontmatter, strippedSource } = getFrontmatter<Frontmatter>(found.source);
  return {
    meta: toMeta(slug, found.lang, frontmatter),
    source: strippedSource,
    aiSummary: await readSummary(slug, found.lang, locale),
  };
}
