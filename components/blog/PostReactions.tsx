"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import type { Locale } from "@/lib/i18n";
import { countText, formatCount, type CountLabels } from "./counts";

type Stats = { views: number; likes: number; liked: boolean };

// The header's counts and the like button share one record per post, so a like shows in both.
const useStats = create<Record<string, Stats>>(() => ({}));
const update = (slug: string, base: Stats, patch: Partial<Stats>) =>
  useStats.setState((all) => ({ [slug]: { ...(all[slug] ?? base), ...patch } }));

/**
 * "1,234 次阅读 · 56 个赞" beside the post's date. Opening the post counts as a read
 * (once per tab per post; the server also counts a visitor once a day).
 */
export function PostCounts({ slug, initial, labels, locale }: { slug: string; initial: Stats; labels: CountLabels; locale: Locale }) {
  const stats = useStats((all) => all[slug]) ?? initial;
  useEffect(() => {
    const key = `qwq:read:${slug}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    fetch(`/api/posts/${slug}/view`, { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { views: number } | null) => d && update(slug, initial, { views: d.views }))
      .catch(() => {});
  }, [slug, initial]);
  return <CountsText views={stats.views} likes={stats.likes} labels={labels} locale={locale} />;
}

export function CountsText({ views, likes, labels, locale }: { views: number | null; likes: number | null; labels: CountLabels; locale: Locale }) {
  return (
    <span className="tabular-nums text-ink-soft">
      {countText(views, "views", labels, locale)} · {countText(likes, "likes", labels, locale)}
    </span>
  );
}

type LikeLabels = { like: string; liked: string };

/** The like at the end of a post: a stamp you can press again to take it back. */
export function LikeButton({ slug, initial, labels, locale }: { slug: string; initial: Stats; labels: LikeLabels; locale: Locale }) {
  const stats = useStats((all) => all[slug]) ?? initial;
  const [busy, setBusy] = useState(false);
  // Bumped on each like, to replay the heart's pop.
  const [pops, setPops] = useState(0);

  const toggle = async () => {
    if (busy) return;
    const before = stats;
    const liked = !before.liked;
    update(slug, initial, { liked, likes: Math.max(0, before.likes + (liked ? 1 : -1)) });
    if (liked) setPops((n) => n + 1);
    setBusy(true);
    try {
      const r = await fetch(`/api/posts/${slug}/like`, { method: "POST" });
      if (!r.ok) throw new Error(String(r.status));
      update(slug, initial, (await r.json()) as Pick<Stats, "likes" | "liked">);
    } catch {
      update(slug, initial, { liked: before.liked, likes: before.likes });
    } finally {
      setBusy(false);
    }
  };

  return <LikeFace liked={stats.liked} likes={stats.likes} labels={labels} locale={locale} pops={pops} onClick={toggle} />;
}

export function LikeFace({
  liked,
  likes,
  labels,
  locale,
  pops = 0,
  onClick,
}: {
  liked: boolean;
  likes: number | null;
  labels: LikeLabels;
  locale: Locale;
  pops?: number;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} aria-pressed={liked} data-cursor="LIKE" className="like-stamp">
      <svg key={pops} aria-hidden viewBox="0 0 24 24" className={`like-heart ${pops ? "like-pop" : ""}`}>
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z" />
      </svg>
      <span>{liked ? labels.liked : labels.like}</span>
      <span className="like-count tabular-nums">{likes === null ? "—" : formatCount(likes, locale)}</span>
    </button>
  );
}
