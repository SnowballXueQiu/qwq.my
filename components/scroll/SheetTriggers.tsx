"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clearSheets, measureSheets } from "@/lib/sceneClock";
import { sheets } from "@/lib/sheets";
import { useSite } from "@/lib/store";

gsap.registerPlugin(ScrollTrigger);

/** Marks the sheet whose section crosses the middle of the viewport as active. */
export function SheetTriggers() {
  useEffect(() => {
    const setSheet = useSite.getState().setSheet;
    const triggers = sheets.flatMap((id, index) => {
      const el = document.querySelector<HTMLElement>(`[data-sheet="${id}"]`);
      if (!el) return [];
      return ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => self.isActive && setSheet(index),
      });
    });
    // Scene time needs fresh section offsets whenever layout shifts.
    measureSheets();
    const observer = new ResizeObserver(() => measureSheets());
    const main = document.getElementById("main");
    if (main) observer.observe(main);
    ScrollTrigger.addEventListener("refresh", measureSheets);
    return () => {
      triggers.forEach((t) => t.kill());
      observer.disconnect();
      ScrollTrigger.removeEventListener("refresh", measureSheets);
      clearSheets();
    };
  }, []);

  return null;
}
