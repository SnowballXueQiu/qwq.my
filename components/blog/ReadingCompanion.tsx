"use client";

import { useEffect } from "react";
import { emit } from "@/lib/fx";

/** QwQ cheers when you reach the end of a post. */
export function ReadingCompanion() {
  useEffect(() => {
    let cheered = false;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const done = max > 0 && window.scrollY / max > 0.97;
      if (done && !cheered) {
        cheered = true;
        emit("face", { expression: "^w^", duration: 3 });
      } else if (!done) {
        cheered = false;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return null;
}
