import { getCollection } from "./database";
import { DEFAULT_POSTS } from "./default-content";
import type { Post } from "./post-types";
import { estimateReadTime } from "./read-time";

export async function getPosts(): Promise<Post[]> {
  const collection = await getCollection("posts");
  if (collection) {
    const posts = await collection.find({}, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
    return (posts as Post[]).map(withGeneratedReadTime);
  }

  return DEFAULT_POSTS.map(withGeneratedReadTime);
}

export async function getPost(slug: string): Promise<Post | undefined> {
  const collection = await getCollection("posts");
  if (collection) {
    const post = await collection.findOne({ slug }, { projection: { _id: 0 } });
    return post ? withGeneratedReadTime(post as Post) : undefined;
  }

  const posts = await getPosts();
  return posts.find((post) => post.slug === slug);
}

export async function updatePost(slug: string, nextPost: Post): Promise<Post> {
  const collection = await getCollection("posts");
  if (!collection) {
    throw new Error("MongoDB is required to update posts.");
  }

  const now = new Date().toISOString();
  const generatedPost = withGeneratedReadTime(nextPost);
  await collection.updateOne({ slug }, { $set: { ...generatedPost, updatedAt: now } }, { upsert: true });
  return { ...generatedPost, updatedAt: now };
}

export async function createPost(post: Post): Promise<Post> {
  const collection = await getCollection("posts");
  if (!collection) {
    throw new Error("MongoDB is required to create posts.");
  }

  const now = new Date().toISOString();
  const nextPost = { ...withGeneratedReadTime(post), views: post.views ?? 0, likes: post.likes ?? 0, createdAt: now, updatedAt: now };
  await collection.insertOne(nextPost);
  return nextPost;
}

export async function deletePost(slug: string): Promise<void> {
  const collection = await getCollection("posts");
  if (!collection) {
    throw new Error("MongoDB is required to delete posts.");
  }

  await collection.deleteOne({ slug });
}

export async function recordPostView(slug: string): Promise<Post | undefined> {
  const collection = await getCollection("posts");
  if (!collection) return getPost(slug);

  const result = await collection.findOneAndUpdate(
    { slug },
    { $inc: { views: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  return result ? withGeneratedReadTime(result as Post) : undefined;
}

export async function incrementPostLike(slug: string): Promise<Post | undefined> {
  const collection = await getCollection("posts");
  if (!collection) return getPost(slug);

  const result = await collection.findOneAndUpdate(
    { slug },
    { $inc: { likes: 1 }, $set: { updatedAt: new Date().toISOString() } },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  return result ? withGeneratedReadTime(result as Post) : undefined;
}

function withGeneratedReadTime(post: Post): Post {
  const content = typeof post.content === "string" ? post.content : String(post.content ?? "");
  return { ...post, content, read: estimateReadTime(content) };
}
