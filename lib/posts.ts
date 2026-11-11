import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getFrontmatter } from "next-mdx-remote-client/utils";
import { locales, type Locale } from "./i18n";
import type { PostMeta } from "./postTypes";

export type { PostMeta };

type Frontmatter = { title?: string; date?: string | Date; summary?: string; tags?: string[] };

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
  return { slug, lang, date, title: fm.title ?? slug, summary: fm.summary ?? "", tags: fm.tags ?? [] };
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

export async function getPost(slug: string, locale: Locale) {
  "use cache";
  const found = await readSource(slug, locale);
  if (!found) return null;
  const { frontmatter, strippedSource } = getFrontmatter<Frontmatter>(found.source);
  return { meta: toMeta(slug, found.lang, frontmatter), source: strippedSource };
}
