import "server-only";
import { cacheLife } from "next/cache";
import snapshot from "@/content/github.json";
import { fetchGithub, type GithubData } from "./githubFetch";

export type { GithubData };

/**
 * Live GitHub data, rendered on the server and refreshed every ten minutes
 * (stale-while-revalidate: a visit past that serves the cached copy and
 * fetches a fresh one behind it). If GitHub can't be reached it falls back to
 * the committed snapshot (pnpm github:snapshot), but only for a minute, so one
 * failed fetch doesn't pin old numbers on the page for hours.
 */
export async function getGithub(): Promise<GithubData> {
  "use cache";
  try {
    const data = await fetchGithub("SnowballXueQiu", process.env.GITHUB_TOKEN);
    cacheLife({ stale: 300, revalidate: 600, expire: 86_400 });
    return data;
  } catch {
    cacheLife({ stale: 30, revalidate: 60, expire: 120 });
    return snapshot as GithubData;
  }
}
