import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import type { PostMeta } from "@/lib/postTypes";
import { ScrollBox } from "./ScrollBox";

/**
 * Every post, beside the column on wide screens: grouped by year, newest first, numbered
 * like the index (BLOG-NNN), with the one being read marked.
 */
export function PostIndex({ posts, current, locale, label }: { posts: PostMeta[]; current: string; locale: Locale; label: string }) {
  const years = new Map<string, { post: PostMeta; no: number }[]>();
  posts.forEach((post, i) => {
    const year = post.date.slice(0, 4);
    years.set(year, [...(years.get(year) ?? []), { post, no: posts.length - i }]);
  });

  return (
    <nav aria-label={label} className="post-side post-index">
      <div className="side-panel">
        <p className="label flex items-center justify-between gap-3 border-b border-ink px-3 py-2">
          <span>{label}</span>
          <span className="tabular-nums text-ink-soft">{String(posts.length).padStart(3, "0")}</span>
        </p>
        <ScrollBox className="pb-1.5">
          {[...years].map(([year, list]) => (
            <section key={year}>
              <p className="label sticky top-0 z-10 bg-paper px-3 pb-1 pt-2.5 text-ink-soft">{year}</p>
              <ul>
                {list.map(({ post, no }) => (
                  <li key={post.slug}>
                    <Link
                      href={`/${locale}/blog/${post.slug}`}
                      aria-current={post.slug === current ? "page" : undefined}
                      className="side-link"
                    >
                      <span className="side-no">{String(no).padStart(3, "0")}</span>
                      <span className="line-clamp-2">{post.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </ScrollBox>
      </div>
    </nav>
  );
}
