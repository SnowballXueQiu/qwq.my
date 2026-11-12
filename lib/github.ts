import "server-only";
import { cacheLife } from "next/cache";
import snapshot from "@/content/github.json";
import { fetchGithub, type GithubData } from "./githubFetch";

export type { GithubData };

/**
 * Live GitHub data, refreshed every few hours on the server. Falls back to the
 * committed snapshot (pnpm github:snapshot) if GitHub can't be reached.
 */
export async function getGithub(): Promise<GithubData> {
  "use cache";
  cacheLife("hours");
  try {
    return await fetchGithub("SnowballXueQiu", process.env.GITHUB_TOKEN);
  } catch {
    return snapshot as GithubData;
  }
}
