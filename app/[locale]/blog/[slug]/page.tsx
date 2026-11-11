import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote, type MDXRemoteOptions } from "next-mdx-remote-client/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { locales } from "@/lib/i18n";
import { getPost, listPosts } from "@/lib/posts";
import { mdxComponents } from "@/components/blog/mdx";
import { ReadingCompanion } from "@/components/blog/ReadingCompanion";

const mdxOptions: MDXRemoteOptions["mdxOptions"] = {
  remarkPlugins: [remarkGfm],
  rehypePlugins: [[rehypePrettyCode, { theme: "vesper", keepBackground: false }]],
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

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { slug } = await params;
  const locale = await getLocale();
  const dict = await getDictionary();
  const post = await getPost(slug, locale);
  if (!post) notFound();

  const posts = await listPosts(locale);
  const index = posts.findIndex((p) => p.slug === slug);
  const newer = posts[index - 1];
  const older = posts[index + 1];

  return (
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
        <p className="label mt-4 text-ink-soft">{post.meta.tags.join(" · ")}</p>
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
  );
}
