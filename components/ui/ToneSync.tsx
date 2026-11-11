"use client";

import { useEffect } from "react";
import { useSite } from "@/lib/store";

/** Flips the CSS palette when the 3D scene crosses from paper into the dark world. */
export function ToneSync() {
  useEffect(() => {
    const html = document.documentElement;
    const apply = (tone: number) => {
      const next = tone > 0.5 ? "dark" : "paper";
      if (html.dataset.tone !== next) html.dataset.tone = next;
    };
    apply(useSite.getState().tone);
    return useSite.subscribe((s) => apply(s.tone));
  }, []);
  return null;
}
