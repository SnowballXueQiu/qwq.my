import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Keyed by post slug, so a post's languages share one count.

/** How many times each post has been read. */
export const postStats = sqliteTable("post_stats", {
  slug: text("slug").primaryKey(),
  views: integer("views").notNull().default(0),
});

/** Who was counted today, so reloading a post doesn't count it again. Only today is kept. */
export const postViews = sqliteTable(
  "post_views",
  {
    slug: text("slug").notNull(),
    visitor: text("visitor").notNull(),
    /** UTC date, YYYY-MM-DD. */
    day: text("day").notNull(),
  },
  (t) => [primaryKey({ columns: [t.slug, t.visitor, t.day] }), index("post_views_day").on(t.day)],
);

/** One row per like: each visitor can like a post once. */
export const postLikes = sqliteTable(
  "post_likes",
  {
    slug: text("slug").notNull(),
    visitor: text("visitor").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [primaryKey({ columns: [t.slug, t.visitor] })],
);
