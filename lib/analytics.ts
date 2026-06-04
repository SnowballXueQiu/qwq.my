import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getCollection, getRedisClient } from "./database";

export type AnalyticsState = {
  totalPageViews: number;
  pages: Record<string, number>;
  updatedAt: string;
};

const analyticsFile = path.join(process.cwd(), "data", "analytics.json");

const fallbackAnalytics: AnalyticsState = {
  totalPageViews: 0,
  pages: {},
  updatedAt: new Date(0).toISOString(),
};

export async function getAnalytics(): Promise<AnalyticsState> {
  const redis = await getRedisClient();
  if (redis) {
    const [total, pages] = await Promise.all([redis.get("analytics:total"), redis.hGetAll("analytics:pages")]);
    if (total !== null || Object.keys(pages).length > 0) {
      return {
        totalPageViews: Number(total ?? 0),
        pages: Object.fromEntries(Object.entries(pages).map(([page, count]) => [page, Number(count)])),
        updatedAt: (await redis.get("analytics:updatedAt")) ?? new Date().toISOString(),
      };
    }
  }

  const collection = await getCollection("analytics");
  if (collection) {
    const document = await collection.findOne({ _id: "current" }, { projection: { _id: 0 } });
    if (document) return document as AnalyticsState;
  }

  try {
    const raw = await readFile(analyticsFile, "utf-8");
    const parsed = JSON.parse(raw) as AnalyticsState;
    return {
      totalPageViews: parsed.totalPageViews ?? 0,
      pages: parsed.pages ?? {},
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
    };
  } catch {
    return fallbackAnalytics;
  }
}

export async function recordPageView(page: string): Promise<AnalyticsState> {
  const normalizedPage = page.startsWith("/") ? page : `/${page}`;

  const redis = await getRedisClient();
  if (redis) {
    const [total] = await Promise.all([
      redis.incr("analytics:total"),
      redis.hIncrBy("analytics:pages", normalizedPage, 1),
      redis.set("analytics:updatedAt", new Date().toISOString()),
    ]);
    const next = await getAnalytics();
    next.totalPageViews = total;

    const collection = await getCollection("analytics");
    if (collection) {
      await collection.updateOne({ _id: "current" }, { $set: { ...next, _id: "current" } }, { upsert: true });
    }
    return next;
  }

  const current = await getAnalytics();
  const next: AnalyticsState = {
    totalPageViews: current.totalPageViews + 1,
    pages: {
      ...current.pages,
      [normalizedPage]: (current.pages[normalizedPage] ?? 0) + 1,
    },
    updatedAt: new Date().toISOString(),
  };

  await mkdir(path.dirname(analyticsFile), { recursive: true });
  await writeFile(analyticsFile, `${JSON.stringify(next, null, 2)}\n`, "utf-8");

  const collection = await getCollection("analytics");
  if (collection) {
    await collection.updateOne({ _id: "current" }, { $set: { ...next, _id: "current" } }, { upsert: true });
  }

  return next;
}
