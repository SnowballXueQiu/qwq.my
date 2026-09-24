"use client";

import { useEffect, useState } from "react";

type GitHubMeta = {
  kind: "repo" | "pull" | "commit" | "link";
  title: string;
  owner: string;
  repo: string;
  description?: string;
  stars?: number;
  additions?: number;
  deletions?: number;
  sha?: string;
  avatarUrl?: string;
};

export function RichLinkCard({ url }: { url: string }) {
  const [meta, setMeta] = useState<GitHubMeta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rich-link?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => {
        if (!cancelled && result?.title) setMeta(result);
        else if (!cancelled) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!meta && !failed) {
    return (
      <a className="rich-link-card github-card loading" href={url}>
        <span className="rich-link-favicon">GitHub</span>
        <div>
          <strong>Loading link card...</strong>
          <small>{url}</small>
        </div>
      </a>
    );
  }

  if (!meta) {
    const host = safeHost(url);
    return (
      <a className="rich-link-card" href={url}>
        <span className="rich-link-favicon">↗</span>
        <div>
          <strong>{host}</strong>
          <small>{url}</small>
        </div>
      </a>
    );
  }

  return (
    <a className="rich-link-card github-card" href={url}>
      <span className="rich-link-favicon">GitHub</span>
      <div>
        <strong>{meta.kind === "pull" ? `PR: ${meta.title}` : meta.title}</strong>
        <small>
          {meta.additions !== undefined ? <span className="github-additions">+{meta.additions}</span> : null}
          {meta.deletions !== undefined ? <span className="github-deletions"> -{meta.deletions}</span> : null}
          {meta.sha ? <span> {meta.sha}</span> : null}
          <span> {meta.owner}/{meta.repo}</span>
        </small>
        {meta.kind === "repo" && meta.description ? <small>{meta.description}</small> : null}
      </div>
      {meta.kind === "repo" && meta.stars !== undefined ? <span className="github-card-stars">☆ {meta.stars}</span> : null}
      {meta.avatarUrl ? <img className="github-card-avatar" src={meta.avatarUrl} alt="" /> : null}
    </a>
  );
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
