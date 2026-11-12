/**
 * Fetches public GitHub data for the site with no token: the contribution
 * calendar (parsed from the public profile fragment) plus profile stats and
 * organisations from the REST API. Dependency-free so a plain Node script can
 * import it too (scripts/fetch-github.ts).
 */

export type GithubDay = { date: string; count: number; level: number };

export type GithubData = {
  login: string;
  /** Contributions in the last year, as GitHub reports it. */
  total: number;
  /** Sunday-first weeks, oldest first; each inner array has up to 7 days. */
  weeks: GithubDay[][];
  repos: number;
  followers: number;
  /** Organisations GitHub highlights on the profile. */
  orgs: { login: string; avatar: string; url: string }[];
  /** "Contributed to A, B, C and N other repositories". */
  contributedTo: string[];
  otherRepos: number;
  /** Activity overview percentages: Commits, Code review, Issues, Pull requests. */
  activity: Record<string, number>;
  fetchedAt: string;
};

const unescape = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

const UA = { "User-Agent": "qwq.my (+https://qwq.my)" };
/** GitHub is unreachable from some networks; give up quickly and use the snapshot. */
const TIMEOUT = 8000;
const get = (url: string, headers: Record<string, string>) => fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT) });

function attr(tag: string, name: string) {
  return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

export function parseContributions(html: string) {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = m[2].match(/^([\d,]+) contribution/);
    counts.set(m[1], n ? Number(n[1].replace(/,/g, "")) : 0);
  }
  const days: GithubDay[] = [];
  for (const m of html.matchAll(/<td[^>]*class="ContributionCalendar-day"[^>]*>/g)) {
    const tag = m[0];
    const date = attr(tag, "data-date");
    const id = attr(tag, "id");
    if (!date || !id) continue;
    days.push({ date, level: Number(attr(tag, "data-level") ?? 0), count: counts.get(id) ?? 0 });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const weeks: GithubDay[][] = [];
  for (const day of days) {
    const weekday = new Date(`${day.date}T00:00:00Z`).getUTCDay();
    if (!weeks.length || weekday === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }
  const total = Number(html.match(/js-contribution-activity-description[^>]*>\s*([\d,]+)/)?.[1]?.replace(/,/g, "") ?? NaN);

  const orgs = [
    ...new Set(
      [...html.matchAll(/js-org-filter-link[^>]*href="[^"]*[?&](?:amp;)?org=([A-Za-z0-9-]+)"/g)].map((m) => m[1]),
    ),
  ];
  const overview = html.split("Contributed to")[1]?.slice(0, 6000) ?? "";
  const contributedTo = [
    ...new Set([...overview.matchAll(/href="\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)"/g)].map((m) => m[1])),
  ].slice(0, 3);
  const otherRepos = Number(overview.match(/(\d+)\s+other\s+repositor/)?.[1] ?? 0);
  let activity: Record<string, number> = {};
  const pct = html.match(/data-percentages="([^"]*)"/)?.[1];
  if (pct) {
    try {
      activity = JSON.parse(unescape(pct));
    } catch {}
  }
  return {
    weeks,
    total: Number.isFinite(total) ? total : days.reduce((a, d) => a + d.count, 0),
    orgs,
    contributedTo,
    otherRepos,
    activity,
  };
}

/** Repo and follower counts from the public profile page (no API quota needed). */
export function parseProfile(html: string) {
  const num = (s?: string) => Number(s?.replace(/,/g, "") ?? NaN);
  const repos = num(html.match(/href="[^"]*\?tab=repositories"[\s\S]{0,800}?class="Counter"[^>]*>([\d,]+)</)?.[1]);
  const followers = num(html.match(/text-bold color-fg-default">([\d,]+)<\/span>\s*followers/)?.[1]);
  return { repos: Number.isFinite(repos) ? repos : 0, followers: Number.isFinite(followers) ? followers : 0 };
}

export async function fetchGithub(login: string, token?: string): Promise<GithubData> {
  const api = { ...UA, Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const counts = async () => {
    // The REST API when it has quota; the public profile page otherwise.
    const r = await get(`https://api.github.com/users/${login}`, api);
    if (r.ok) {
      const u = await r.json();
      return { repos: u.public_repos ?? 0, followers: u.followers ?? 0 };
    }
    const page = await get(`https://github.com/${login}`, UA);
    return page.ok ? parseProfile(await page.text()) : { repos: 0, followers: 0 };
  };
  const [calendar, user] = await Promise.all([
    get(`https://github.com/users/${login}/contributions`, UA).then((r) => {
      if (!r.ok) throw new Error(`contributions ${r.status}`);
      return r.text();
    }),
    counts().catch(() => ({ repos: 0, followers: 0 })),
  ]);
  const parsed = parseContributions(calendar);
  if (!parsed.weeks.length) throw new Error("empty contribution calendar");
  return {
    login,
    total: parsed.total,
    weeks: parsed.weeks,
    repos: user.repos,
    followers: user.followers,
    orgs: parsed.orgs.map((org) => ({
      login: org,
      avatar: `https://github.com/${org}.png?size=80`,
      url: `https://github.com/${org}`,
    })),
    contributedTo: parsed.contributedTo,
    otherRepos: parsed.otherRepos,
    activity: parsed.activity,
    fetchedAt: new Date().toISOString(),
  };
}
