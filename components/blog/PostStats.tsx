import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Locale } from "@/lib/i18n";
import { readAllStats, readStats, VISITOR_COOKIE } from "@/lib/postStats";
import type { CountLabels } from "./counts";
import { CountsText, LikeButton, LikeFace, PostCounts } from "./PostReactions";

// Counts are read at request time, inside <Suspense>: the rest of the page stays
// prerendered, and the fallbacks below hold the same space until the numbers arrive.
// If the database can't be read, the counts stay dashes rather than breaking the page.

async function statsFor(slug: string) {
  const visitor = (await cookies()).get(VISITOR_COOKIE)?.value;
  try {
    return readStats(slug, visitor);
  } catch (error) {
    console.error("post stats:", error);
    return null;
  }
}

type Labels = CountLabels & { like: string; liked: string };

export async function PostCountsSlot({ slug, labels, locale }: { slug: string; labels: Labels; locale: Locale }) {
  const stats = await statsFor(slug);
  return stats ? <PostCounts slug={slug} initial={stats} labels={labels} locale={locale} /> : <CountsFallback labels={labels} locale={locale} />;
}

export const CountsFallback = ({ labels, locale }: { labels: Labels; locale: Locale }) => (
  <CountsText views={null} likes={null} labels={labels} locale={locale} />
);

export async function LikeSlot({ slug, labels, locale }: { slug: string; labels: Labels; locale: Locale }) {
  const stats = await statsFor(slug);
  return stats ? <LikeButton slug={slug} initial={stats} labels={labels} locale={locale} /> : <LikeFallback labels={labels} locale={locale} />;
}

export const LikeFallback = ({ labels, locale }: { labels: Labels; locale: Locale }) => (
  <LikeFace liked={false} likes={null} labels={labels} locale={locale} />
);

/** Every post's views and likes, for the lists; null if the database can't be read. */
export async function allStats() {
  await connection();
  try {
    return readAllStats();
  } catch (error) {
    console.error("post stats:", error);
    return null;
  }
}
