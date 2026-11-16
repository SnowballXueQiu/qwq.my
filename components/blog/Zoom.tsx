"use client";

import { showLightbox } from "@/components/ui/Lightbox";

type Shot = { src: string; alt: string };

/** Makes an image (or one of a set) open full-screen in the site's lightbox. */
export function Zoom({
  shots,
  index = 0,
  className,
  style,
  children,
}: {
  shots: Shot[];
  index?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      style={style}
      data-cursor="ZOOM"
      aria-label={shots[index].alt || "Open image"}
      onClick={() => showLightbox(shots, index)}
    >
      {children}
    </button>
  );
}
