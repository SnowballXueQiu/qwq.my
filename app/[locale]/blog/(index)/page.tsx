import type { Metadata } from "next";
import { ViewTransition } from "react";
import { getDictionary, getLocale } from "@/lib/dictionaries";
import { listPosts } from "@/lib/posts";
import { PostTable, numbered } from "@/components/blog/PostTable";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.blog.title };
}

export default async function BlogIndex() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const posts = await listPosts(locale);

  // Changing tag swaps only the list (see the layout).
  return (
    <ViewTransition enter="list-in" exit="list-out" default="none">
      <PostTable posts={numbered(posts)} locale={locale} dict={dict} caption={dict.blog.index} />
    </ViewTransition>
  );
}
