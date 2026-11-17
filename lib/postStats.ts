import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { and, count, eq, lt, sql } from "drizzle-orm";
import { getDb } from "./db";
import { postLikes, postStats, postViews } from "./db/schema";

/** A post's counts as one visitor sees them. */
export type PostStats = { views: number; likes: number; liked: boolean };

/** The cookie that tells visitors apart: a random id, nothing else about them. */
export const VISITOR_COOKIE = "qwq_vid";

/** Only real posts get rows: a slug must look like one and have a folder in content/posts. */
export function isPost(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 && existsSync(path.join(process.cwd(), "content", "posts", slug));
}

function likesOf(slug: string) {
  return getDb().select({ n: count() }).from(postLikes).where(eq(postLikes.slug, slug)).get()?.n ?? 0;
}

export function readStats(slug: string, visitor: string | undefined): PostStats {
  const db = getDb();
  const views = db.select({ views: postStats.views }).from(postStats).where(eq(postStats.slug, slug)).get()?.views ?? 0;
  const liked = visitor
    ? Boolean(db.select({ slug: postLikes.slug }).from(postLikes).where(and(eq(postLikes.slug, slug), eq(postLikes.visitor, visitor))).get())
    : false;
  return { views, likes: likesOf(slug), liked };
}

/** Every post's counts, for the lists. */
export function readAllStats(): Record<string, { views: number; likes: number }> {
  const db = getDb();
  const all: Record<string, { views: number; likes: number }> = {};
  for (const row of db.select().from(postStats).all()) all[row.slug] = { views: row.views, likes: 0 };
  for (const row of db.select({ slug: postLikes.slug, n: count() }).from(postLikes).groupBy(postLikes.slug).all()) {
    all[row.slug] = { views: all[row.slug]?.views ?? 0, likes: row.n };
  }
  return all;
}

/** Counts a read, at most once per visitor per post per (UTC) day. Returns the new total. */
export function recordView(slug: string, visitor: string) {
  const day = new Date().toISOString().slice(0, 10);
  return getDb().transaction((tx) => {
    const fresh = tx.insert(postViews).values({ slug, visitor, day }).onConflictDoNothing().run().changes > 0;
    if (fresh) {
      tx.insert(postStats)
        .values({ slug, views: 1 })
        .onConflictDoUpdate({ target: postStats.slug, set: { views: sql`${postStats.views} + 1` } })
        .run();
      // Yesterday's list of who was counted is no longer needed.
      tx.delete(postViews).where(lt(postViews.day, day)).run();
    }
    return tx.select({ views: postStats.views }).from(postStats).where(eq(postStats.slug, slug)).get()?.views ?? 0;
  });
}

/** Likes the post, or takes the like back if this visitor already gave one. */
export function toggleLike(slug: string, visitor: string): Pick<PostStats, "likes" | "liked"> {
  const db = getDb();
  const removed = db.delete(postLikes).where(and(eq(postLikes.slug, slug), eq(postLikes.visitor, visitor))).run().changes > 0;
  if (!removed) db.insert(postLikes).values({ slug, visitor }).onConflictDoNothing().run();
  return { likes: likesOf(slug), liked: !removed };
}
