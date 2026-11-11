"use client";

import { useEffect, useState } from "react";
import { Font, type FontData } from "three/examples/jsm/loaders/FontLoader.js";

export const FONTS = {
  display: "/fonts/archivo-condensed-black.typeface.json",
  mono: "/fonts/jetbrains-mono-bold.typeface.json",
} as const;

export type FontName = keyof typeof FONTS;

const cache = new Map<FontName, Promise<Font>>();

let resolveUrl = (path: string) => path;
/** Lets a host with a different static base (Remotion's staticFile) rewrite font URLs. */
export const setFontUrlResolver = (fn: (path: string) => string) => {
  resolveUrl = fn;
};

export function loadFont(name: FontName) {
  let p = cache.get(name);
  if (!p) {
    p = fetch(resolveUrl(FONTS[name]))
      .then((r) => r.json() as Promise<FontData>)
      .then((json) => new Font(json));
    cache.set(name, p);
  }
  return p;
}

export function useFont(name: FontName) {
  const [font, setFont] = useState<Font | null>(null);
  useEffect(() => {
    let alive = true;
    loadFont(name).then((f) => alive && setFont(f));
    return () => {
      alive = false;
    };
  }, [name]);
  return font;
}
