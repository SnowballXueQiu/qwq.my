import Link from "next/link";
import type { Dictionary } from "@/lib/dictionaries";
import type { Locale } from "@/lib/i18n";
import type { PostMeta } from "@/lib/postTypes";
import { Panel } from "@/components/sections/Panel";
import { AigcBadge } from "./AigcBadge";
import { TagList } from "./Tags";

/**
 * The list of drawings: number, title and summary, tags, date. `no` is a post's number
 * in the whole blog (the one on its own page), so a tag's list keeps the same numbers.
 */
export function PostTable({
  posts,
  locale,
  dict,
  caption,
}: {
  posts: (PostMeta & { no: number })[];
  locale: Locale;
  dict: Dictionary;
  caption: React.ReactNode;
}) {
  return (
    <Panel className="!p-0">
      <table className="w-full border-collapse text-left">
        <caption className="label border-b border-ink px-4 py-2 text-left text-ink-soft">{caption}</caption>
        <tbody>
          {posts.map((post) => (
            <tr key={post.slug} className="border-b border-rule last:border-0">
              <td className="label w-14 px-4 py-4 align-top text-accent">{String(post.no).padStart(3, "0")}</td>
              <td className="py-4 pr-4">
                <Link href={`/${locale}/blog/${post.slug}`} data-cursor="READ" className="group block">
                  <span className="text-lg font-semibold group-hover:text-accent">{post.title}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{post.summary}</span>
                </Link>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <TagList ids={post.tags} locale={locale} />
                  {post.aigc && <AigcBadge label={dict.blog.aigc} note={dict.blog.aigcNote} compact />}
                  <span className="label ml-1 text-ink-soft sm:hidden">{post.date}</span>
                </div>
              </td>
              <td className="label hidden w-28 py-4 pr-4 text-right align-top text-ink-soft sm:table-cell">
                {post.date}
                {post.lang !== locale && <span className="mt-1 block text-accent">{post.lang.toUpperCase()}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

/** Posts with their blog-wide numbers: the newest is the highest. */
export const numbered = (posts: PostMeta[]) => posts.map((p, i) => ({ ...p, no: posts.length - i }));
