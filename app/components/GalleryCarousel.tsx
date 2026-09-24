"use client";

import { useEffect, useState } from "react";

export type GalleryImage = {
  url: string;
  alt: string;
};

export function GalleryCarousel({ items }: { items: GalleryImage[] }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [entering, setEntering] = useState(true);
  if (!items.length) return null;

  const active = items[index] ?? items[0];
  const move = (nextDirection: 1 | -1) => {
    setDirection(nextDirection);
    setEntering(false);
    window.setTimeout(() => {
      setIndex((current) => (current + nextDirection + items.length) % items.length);
      setEntering(true);
    }, 240);
  };

  useEffect(() => {
    setEntering(true);
  }, [index]);

  return (
    <figure className="markdown-gallery-carousel">
      <div className={`gallery-stage ${entering ? "entering" : "exiting"} ${direction === 1 ? "forward" : "backward"}`}>
        <img src={active.url} alt={active.alt} />
      </div>
      {items.length > 1 ? (
        <>
          <button className="gallery-nav previous" type="button" onClick={() => move(-1)} aria-label="Previous image">
            ‹
          </button>
          <button className="gallery-nav next" type="button" onClick={() => move(1)} aria-label="Next image">
            ›
          </button>
          <figcaption>
            {index + 1} / {items.length}
          </figcaption>
        </>
      ) : null}
    </figure>
  );
}
