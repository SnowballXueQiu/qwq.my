// Keeps the posts' AI summaries in step with the posts:
//   pnpm summaries                 which posts need a summary written (or rewritten)
//   pnpm summaries stamp <slug>…   record the text a post's summary was written from
//
// A summary lives in content/posts/<slug>/summary.json, keyed by the language of the text
// it was written from (a post with zh.mdx and en.mdx has two entries). Each entry keeps a
// fingerprint of that text: small edits leave the summary alone, and once the post has
// drifted far enough from it the summary is flagged to be rewritten. Posts that aren't
// articles (a paragraph, a few photos, lyrical prose) get { "skip": why } instead; they
// are flagged again if they grow into something else.
import { readdir, readFile, writeFile } from "node:fs/promises";

const ROOT = new URL("../content/posts/", import.meta.url);
const LANGS = ["zh", "en"] as const;
const HASHES = 128;
/** Below this similarity to the text it was written from, a summary is out of date. */
const STALE = 0.8;

type Source = { chars: number; minhash: string };
type Entry = { text?: Partial<Record<(typeof LANGS)[number], string>>; skip?: string; source?: Source };
type File = Partial<Record<(typeof LANGS)[number], Entry>>;

/** The words of a post: no frontmatter, markup, links or tags. */
function plain(mdx: string) {
  return mdx
    .replace(/^---\n[\s\S]*?\n---\n/, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_>`|~\\$=-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};
const mix = (x: number) => {
  let h = x;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
};
const SEEDS = Array.from({ length: HASHES }, (_, i) => mix(0x9e3779b9 + i));

/**
 * MinHash over 4-character shingles: the share of slots two fingerprints agree on
 * estimates how much of their text they share (Jaccard similarity), to about ±0.04.
 */
function fingerprint(text: string): Source {
  const chars = [...text];
  const min = new Uint32Array(HASHES).fill(0xffffffff);
  const seen = new Set<number>();
  for (let i = 0; i + 4 <= chars.length; i++) {
    const x = fnv(chars.slice(i, i + 4).join(""));
    if (seen.has(x)) continue;
    seen.add(x);
    for (let k = 0; k < HASHES; k++) {
      const v = mix(x ^ SEEDS[k]);
      if (v < min[k]) min[k] = v;
    }
  }
  return { chars: chars.length, minhash: Buffer.from(min.buffer).toString("base64") };
}

function similarity(a: Source, b: Source) {
  const x = new Uint32Array(new Uint8Array(Buffer.from(a.minhash, "base64")).buffer);
  const y = new Uint32Array(new Uint8Array(Buffer.from(b.minhash, "base64")).buffer);
  let same = 0;
  for (let k = 0; k < HASHES; k++) if (x[k] === y[k]) same++;
  return same / HASHES;
}

const readJson = async (url: URL): Promise<File> => {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return {};
  }
};

async function posts() {
  const dirs = (await readdir(ROOT, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  return Promise.all(
    dirs.sort().map(async (slug) => {
      const texts: Partial<Record<(typeof LANGS)[number], string>> = {};
      for (const lang of LANGS) {
        try {
          texts[lang] = plain(await readFile(new URL(`${slug}/${lang}.mdx`, ROOT), "utf8"));
        } catch {}
      }
      return { slug, texts, file: new URL(`${slug}/summary.json`, ROOT) };
    }),
  );
}

const [command, ...slugs] = process.argv.slice(2);

if (command === "stamp") {
  if (!slugs.length) throw new Error("usage: pnpm summaries stamp <slug>…");
  const all = await posts();
  for (const slug of slugs) {
    const post = all.find((p) => p.slug === slug);
    if (!post) throw new Error(`no post ${slug}`);
    const data = await readJson(post.file);
    for (const lang of LANGS) {
      const text = post.texts[lang];
      if (text === undefined) continue;
      const entry = data[lang];
      if (!entry || (!entry.text && !entry.skip)) throw new Error(`${slug} (${lang}): write the summary or a skip first`);
      entry.source = fingerprint(text);
      console.log(`stamped ${slug} (${lang}), ${entry.source.chars} chars`);
    }
    await writeFile(post.file, JSON.stringify(data, null, 2) + "\n");
  }
} else if (command === undefined) {
  let todo = 0;
  for (const post of await posts()) {
    const data = await readJson(post.file);
    for (const lang of LANGS) {
      const text = post.texts[lang];
      if (text === undefined) continue;
      const entry = data[lang];
      const sim = entry?.source ? similarity(entry.source, fingerprint(text)) : 0;
      const pct = `${Math.round(sim * 100)}%`.padStart(4);
      let status: string;
      if (!entry || (!entry.text && !entry.skip)) status = "MISSING  ";
      else if (!entry.source) status = "UNSTAMPED";
      else if (sim < STALE) status = entry.skip ? "RECHECK  " : "STALE    ";
      else status = entry.skip ? "skip     " : "ok       ";
      if (!/^(ok|skip)/.test(status)) todo++;
      console.log(`${status} ${entry?.source ? pct : "   -"}  ${post.slug} (${lang})${entry?.skip ? `  · ${entry.skip}` : ""}`);
    }
  }
  console.log(todo ? `\n${todo} to do: write or rewrite those summaries, then pnpm summaries stamp <slug>` : "\nall summaries are current");
  process.exitCode = todo ? 1 : 0;
} else {
  throw new Error(`unknown command ${command}`);
}
