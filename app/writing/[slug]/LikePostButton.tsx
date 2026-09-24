"use client";

import { useEffect, useState, useTransition } from "react";

export function LikePostButton({ slug, initialLikes }: { slug: string; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes);
  const [locked, setLocked] = useState(false);
  const [flash, setFlash] = useState(false);
  const [isPending, startTransition] = useTransition();
  const storageKey = `liked:${slug}`;

  useEffect(() => {
    const likedAt = Number(window.localStorage.getItem(storageKey) ?? 0);
    setLocked(Date.now() - likedAt < 60_000);
  }, [storageKey]);

  function like() {
    if (locked || isPending) return;
    startTransition(async () => {
      const response = await fetch(`/api/posts/${slug}/like`, { method: "POST" });
      if (!response.ok) return;
      const result = (await response.json()) as { likes: number };
      setLikes(result.likes);
      window.localStorage.setItem(storageKey, String(Date.now()));
      setLocked(true);
      setFlash(true);
      window.setTimeout(() => setFlash(false), 260);
      window.setTimeout(() => setLocked(false), 60_000);
    });
  }

  return (
    <button
      className={flash ? "button secondary article-like-button liked" : "button secondary article-like-button"}
      type="button"
      onClick={like}
      disabled={isPending || locked}
    >
      <span className="like-icon-shell" aria-hidden="true">
        <span className="crayon-heart">♡</span>
      </span>
      <span className="like-label">{locked ? "Liked" : "Like"}</span>
      <span className="like-count">{likes}</span>
    </button>
  );
}
