import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { isTag, tags } from "@/content/tags";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { listPosts, listTags } from "@/lib/posts";
import { PostTable, numbered } from "@/components/blog/PostTable";

export async function generateStaticParams() {
  const used = await listTags("zh");
  return used.map(({ id }) => ({ tag: id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/tag/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  if (!isTag(tag)) return {};
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: `#${tags[tag][locale]} · ${dict.blog.title}` };
}

export default function TagPage({ params }: PageProps<"/[locale]/blog/tag/[tag]">) {
  // Every tag in use is prerendered; the fallback only shows on a cold navigation.
  return (
    <Suspense fallback={null}>
      <TagPosts params={params} />
    </Suspense>
  );
}

async function TagPosts({ params }: { params: PageProps<"/[locale]/blog/tag/[tag]">["params"] }) {
  const { tag } = await params;
  if (!isTag(tag)) notFound();
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = numbered(await listPosts(locale)).filter((p) => p.tags.includes(tag));
  if (!posts.length) notFound();

  return (
    <ViewTransition key={tag} enter="list-in" exit="list-out" default="none">
      <PostTable
        posts={posts}
        locale={locale}
        dict={dict}
        caption={
          <>
            {dict.blog.index} · <span className="text-accent">#{tags[tag][locale]}</span> · {posts.length}
          </>
        }
      />
    </ViewTransition>
  );
}
