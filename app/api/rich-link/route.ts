import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type GitHubUser = { avatar_url?: string };
type GitHubRepo = { name: string; full_name: string; description?: string; stargazers_count?: number; owner?: GitHubUser };
type GitHubPull = { title: string; additions?: number; deletions?: number; user?: GitHubUser };
type GitHubCommit = { sha: string; stats?: { additions?: number; deletions?: number }; commit?: { message?: string }; author?: GitHubUser };

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const parsed = parseGitHubUrl(url);
  if (!parsed) return NextResponse.json({ kind: "link", title: url }, { status: 400 });

  try {
    if (parsed.type === "pull" && parsed.id) {
      const pull = await fetchGitHub<GitHubPull>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.id}`);
      return NextResponse.json({
        kind: "pull",
        title: pull.title,
        owner: parsed.owner,
        repo: parsed.repo,
        additions: pull.additions ?? 0,
        deletions: pull.deletions ?? 0,
        avatarUrl: pull.user?.avatar_url,
      });
    }

    if (parsed.type === "commit" && parsed.id) {
      const commit = await fetchGitHub<GitHubCommit>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/commits/${parsed.id}`);
      return NextResponse.json({
        kind: "commit",
        title: commit.commit?.message?.split("\n")[0] ?? `Commit ${commit.sha.slice(0, 7)}`,
        owner: parsed.owner,
        repo: parsed.repo,
        sha: commit.sha.slice(0, 7),
        additions: commit.stats?.additions ?? 0,
        deletions: commit.stats?.deletions ?? 0,
        avatarUrl: commit.author?.avatar_url,
      });
    }

    const repo = await fetchGitHub<GitHubRepo>(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`);
    return NextResponse.json({
      kind: "repo",
      title: repo.name,
      owner: parsed.owner,
      repo: parsed.repo,
      description: repo.description ?? "",
      stars: repo.stargazers_count ?? 0,
      avatarUrl: repo.owner?.avatar_url,
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch GitHub metadata." }, { status: 502 });
  }
}

async function fetchGitHub<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("GitHub request failed.");
  return response.json() as Promise<T>;
}

function parseGitHubUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo, type, id] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo, type, id };
  } catch {
    return null;
  }
}
