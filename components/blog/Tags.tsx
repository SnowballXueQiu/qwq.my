import Link from "next/link";
import { tags, type TagId } from "@/content/tags";
import type { Locale } from "@/lib/i18n";

export const tagHref = (locale: Locale, id: TagId) => `/${locale}/blog/tag/${id}`;

/** A post's tags, each a link to every post that carries it: "#数学 #物理". */
export function TagList({ ids, locale, className = "" }: { ids: TagId[]; locale: Locale; className?: string }) {
  if (!ids.length) return null;
  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`}>
      {ids.map((id) => (
        <li key={id}>
          <Link href={tagHref(locale, id)} data-cursor="TAG" className="tag-chip">
            <span aria-hidden className="tag-hash">
              #
            </span>
            {tags[id][locale]}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type TagCount = { id: TagId; count: number };

/** The blog index's tag bar: everything, then one chip per tag with its count. */
export function TagChips({
  locale,
  items,
  total,
  active,
  labels,
}: {
  locale: Locale;
  items: TagCount[];
  total: number;
  active?: TagId;
  labels: { all: string; tags: string };
}) {
  return (
    <nav aria-label={labels.tags} className="flex flex-wrap items-center gap-1.5">
      <span className="label mr-2 text-ink-soft">{labels.tags}</span>
      <Link href={`/${locale}/blog`} aria-current={active ? undefined : "page"} className="tag-chip">
        {labels.all}
        <span className="tag-count">{total}</span>
      </Link>
      {items.map(({ id, count }) => (
        <Link key={id} href={tagHref(locale, id)} aria-current={id === active ? "page" : undefined} data-cursor="TAG" className="tag-chip">
          <span aria-hidden className="tag-hash">
            #
          </span>
          {tags[id][locale]}
          <span className="tag-count">{count}</span>
        </Link>
      ))}
    </nav>
  );
}
