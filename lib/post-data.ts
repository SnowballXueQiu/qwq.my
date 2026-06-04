import postsJson from "@/data/posts.json";
import type { Post } from "./post-types";

export function getStaticPosts(): Post[] {
  return postsJson as Post[];
}

export function parsePostDate(value: string) {
  return new Date(value.replace(",", "")).getTime();
}
