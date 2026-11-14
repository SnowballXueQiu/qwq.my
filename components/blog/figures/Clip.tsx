"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A short silent loop recorded from the site itself (a GIF, but sharp and a
 * tenth of the size). Plays only while on screen; with reduced motion it waits
 * for a click.
 */
export function Clip({ src, poster, label }: { src: string; poster: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setCalm(reduce);
    if (reduce) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    observer.observe(v);
    return () => observer.disconnect();
  }, []);
  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      aria-label={label}
      muted
      loop
      playsInline
      preload="metadata"
      controls={calm}
      className="block aspect-[16/10] w-full bg-ink object-cover"
    />
  );
}
