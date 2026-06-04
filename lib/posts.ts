import fs from "node:fs/promises";
import path from "node:path";
import { getCollection } from "./database";
import type { Post } from "./post-types";

const postsPath = path.join(process.cwd(), "data", "posts.json");

export async function getPosts(): Promise<Post[]> {
  const collection = await getCollection("posts");
  if (collection) {
    const posts = await collection.find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
    return posts as Post[];
  }

  const raw = await fs.readFile(postsPath, "utf8");
  return JSON.parse(raw) as Post[];
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const collection = await getCollection("posts");
  if (collection) {
    const post = await collection.findOne({ slug }, { projection: { _id: 0 } });
    return (post as Post | null) ?? undefined;
  }

  const posts = await getPosts();
  return posts.find((post) => post.slug === slug);
}

export async function updatePost(slug: string, nextPost: Post): Promise<Post> {
  const collection = await getCollection("posts");
  if (collection) {
    await collection.updateOne({ slug }, { $set: nextPost }, { upsert: true });
    return nextPost;
  }

  const posts = await getPosts();
  const index = posts.findIndex((post) => post.slug === slug);

  if (index === -1) {
    throw new Error(`Post not found: ${slug}`);
  }

  posts[index] = nextPost;
  await fs.writeFile(postsPath, `${JSON.stringify(posts, null, 2)}\n`, "utf8");
  return nextPost;
}
