import { Suspense } from "react";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { listPosts, listTags } from "@/lib/posts";
import { TagBar } from "@/components/blog/TagBar";
import { TagChips } from "@/components/blog/Tags";
import { PageTransition } from "@/components/ui/PageTransition";

/**
 * The blog index and each tag's list share this sheet: picking a tag keeps the title and
 * the tag bar in place and swaps only the list under them.
 */
export default async function BlogIndexLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const dict = await getDictionary();
  const [posts, used] = await Promise.all([listPosts(locale), listTags(locale)]);
  const bar = { locale, items: used, total: posts.length, labels: { all: dict.blog.all, tags: dict.blog.tags } };

  return (
    <PageTransition>
      <main id="main" className="relative z-10 min-h-svh" style={{ padding: "calc(var(--sheet-pad) + 56px) var(--sheet-pad)" }}>
        <div className="mx-auto max-w-3xl">
          <p className="label text-accent">DWG · INDEX</p>
          <h1 className="font-display mt-2 text-[clamp(3rem,9vw,7rem)] font-black leading-[0.85] tracking-[-0.04em] font-condensed">
            {dict.blog.title}
          </h1>
          <p className="mt-3 text-ink-soft">{dict.blog.lead}</p>
          <div className="mt-8">
            <Suspense fallback={<TagChips {...bar} />}>
              <TagBar {...bar} />
            </Suspense>
          </div>
          <div className="mt-4">{children}</div>
        </div>
      </main>
    </PageTransition>
  );
}
