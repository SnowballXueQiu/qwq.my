import type { Metadata } from "next";
import Link from "next/link";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { listPosts } from "@/lib/posts";
import { Panel } from "@/components/sections/Panel";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.blog.title };
}

export default async function BlogIndex() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = await listPosts(locale);

  return (
    <main id="main" className="relative z-10 min-h-svh" style={{ padding: "calc(var(--sheet-pad) + 56px) var(--sheet-pad)" }}>
      <div className="mx-auto max-w-3xl">
        <p className="label text-accent">DWG · INDEX</p>
        <h1 className="font-display mt-2 text-[clamp(3rem,9vw,7rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
          {dict.blog.title}
        </h1>
        <p className="mt-3 text-ink-soft">{dict.blog.lead}</p>
        <Panel className="mt-10 !p-0">
          <table className="w-full border-collapse text-left">
            <caption className="label border-b border-ink px-4 py-2 text-left text-ink-soft">{dict.blog.index}</caption>
            <tbody>
              {posts.map((post, i) => (
                <tr key={post.slug} className="group border-b border-rule last:border-0">
                  <td className="label w-14 px-4 py-4 align-top text-accent">{String(posts.length - i).padStart(3, "0")}</td>
                  <td className="py-4 pr-4">
                    <Link href={`/${locale}/blog/${post.slug}`} data-cursor="READ" className="block">
                      <span className="text-lg font-semibold group-hover:text-accent">{post.title}</span>
                      <span className="mt-1 block text-sm text-ink-soft">{post.summary}</span>
                    </Link>
                  </td>
                  <td className="label hidden py-4 pr-4 text-right align-top text-ink-soft sm:table-cell">
                    {post.date}
                    <span className="mt-1 block">{post.tags.join(" · ")}</span>
                    {post.lang !== locale && <span className="mt-1 block text-accent">{post.lang.toUpperCase()}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </main>
  );
}
