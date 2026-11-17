import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MDXRemote, type MDXRemoteOptions } from "next-mdx-remote-client/rsc";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode, { type LineElement, type Options as PrettyCodeOptions } from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { getPost, listPosts } from "@/lib/posts";
import { mdxComponents } from "@/components/blog/mdx";
import { AigcBadge } from "@/components/blog/AigcBadge";
import { ReadingCompanion } from "@/components/blog/ReadingCompanion";
import { TagList } from "@/components/blog/Tags";
import { PageTransition } from "@/components/ui/PageTransition";

type HastNode = { type: string; value?: string; children?: HastNode[] };
const textOf = (n: HastNode): string => n.value ?? (n.children ?? []).map(textOf).join("");

/**
 * Code wraps instead of scrolling, the way an editor's word wrap does: a wrapped line
 * continues at its own indentation. Each line carries its indent (in columns) for the CSS.
 */
const prettyCode: PrettyCodeOptions = {
  theme: "vesper",
  keepBackground: false,
  defaultLang: { block: "plaintext" },
  onVisitLine(line: LineElement) {
    const lead = /^[ \t]*/.exec(textOf(line as HastNode))![0];
    const columns = [...lead].reduce((n, c) => (c === "\t" ? n + 4 - (n % 4) : n + 1), 0);
    if (columns) line.properties.style = `--indent:${columns}ch`;
  },
};

const mdxOptions: MDXRemoteOptions["mdxOptions"] = {
  remarkPlugins: [remarkGfm, remarkMath],
  // KaTeX: some posts write Chinese inside formulas, which strict mode would warn about.
  rehypePlugins: [
    [rehypeKatex, { strict: false }],
    [rehypePrettyCode, prettyCode],
  ],
};

/** Compiled once per source: MDX and Shiki do request-independent work that shouldn't rerun. */
async function PostBody({ source }: { source: string }) {
  "use cache";
  return <MDXRemote source={source} options={{ mdxOptions }} components={mdxComponents} />;
}

export async function generateStaticParams() {
  const all = await Promise.all(locales.map((l) => listPosts(l)));
  return [...new Set(all.flat().map((p) => p.slug))].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug, await getLocale());
  return post ? { title: post.meta.title, description: post.meta.summary } : {};
}

export default function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  // Reading the slug suspends; every slug is prerendered, so the fallback is only
  // seen on a cold, uncached navigation.
  return (
    <Suspense fallback={<main id="main" className="min-h-svh" />}>
      <Post params={params} />
    </Suspense>
  );
}

async function Post({ params }: { params: PageProps<"/[locale]/blog/[slug]">["params"] }) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const post = await getPost(slug, locale);
  if (!post) notFound();

  const posts = await listPosts(locale);
  const index = posts.findIndex((p) => p.slug === slug);
  const newer = posts[index - 1];
  const older = posts[index + 1];

  // Keyed by post: going from one post to the next is a page change too.
  return (
    <PageTransition key={slug}>
      <main id="main" className="relative z-10 min-h-svh" style={{ padding: "calc(var(--sheet-pad) + 56px) var(--sheet-pad) 160px" }}>
        <ReadingCompanion />
        <article lang={post.meta.lang === "zh" ? "zh-CN" : "en"} className="mx-auto max-w-[680px]">
          <Link href={`/${locale}/blog`} className="label text-ink-soft hover:text-accent">
            ← {dict.blog.back}
          </Link>
          <p className="label mt-8 text-accent">
            DWG · BLOG-{String(posts.length - index).padStart(3, "0")} · {post.meta.date}
          </p>
          <h1 className="font-display mt-3 text-[clamp(2.4rem,6vw,4.4rem)] font-black leading-[0.95] tracking-[-0.03em]">
            {post.meta.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            <TagList ids={post.meta.tags} locale={locale} />
            {post.meta.aigc && <AigcBadge label={dict.blog.aigc} note={dict.blog.aigcNote} />}
          </div>
          {post.meta.lang !== locale && (
            <p className="mt-6 border-l-2 border-accent bg-paper/80 py-2 pl-3 text-sm text-ink-soft">{dict.blog.fallback}</p>
          )}
          <div className="prose-qwq mt-10">
            <PostBody source={post.source} />
          </div>
          <nav className="mt-16 grid gap-px border border-ink bg-ink sm:grid-cols-2" aria-label={dict.blog.more}>
            {[older, newer].map((p, i) =>
              p ? (
                <Link key={p.slug} href={`/${locale}/blog/${p.slug}`} className={`bg-paper p-4 hover:text-accent ${i ? "sm:text-right" : ""}`}>
                  <span className="label block text-ink-soft">{i ? dict.blog.newer : dict.blog.older}</span>
                  <span className="mt-1 block font-semibold">{p.title}</span>
                </Link>
              ) : (
                <span key={i} className="bg-paper p-4" />
              ),
            )}
          </nav>
        </article>
      </main>
    </PageTransition>
  );
}
