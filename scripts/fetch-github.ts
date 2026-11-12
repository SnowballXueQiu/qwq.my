// Saves a GitHub snapshot for offline builds and the year-in-review render:
//   pnpm github:snapshot
import { writeFile } from "node:fs/promises";
import { fetchGithub } from "../lib/githubFetch.ts";

const data = await fetchGithub("SnowballXueQiu", process.env.GITHUB_TOKEN);
await writeFile(new URL("../content/github.json", import.meta.url), JSON.stringify(data) + "\n");
console.log(`saved ${data.total} contributions, ${data.weeks.length} weeks, ${data.orgs.length} orgs`);
