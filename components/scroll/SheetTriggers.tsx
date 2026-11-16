"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clearSheets, getSceneTime, measureSheets } from "@/lib/sceneClock";
import { sheets, type SheetId } from "@/lib/sheets";
import { landOnSheet } from "./beats";
import { useSite } from "@/lib/store";

/**
 * Keeps the scene clock's section offsets fresh and publishes the active sheet.
 * The active sheet comes from scene time, so it always agrees with the 3D world.
 */
export function SheetTriggers() {
  useEffect(() => {
    const { setSheet } = useSite.getState();
    const update = () => {
      const s = getSceneTime();
      const index = Math.min(Math.floor(s + 0.04), sheets.length - 1);
      if (useSite.getState().sheet !== index) setSheet(index);
    };

    measureSheets();
    update();
    // Came in with #sheet (a link from another page): land on that sheet's beat, after
    // the browser's own jump to the anchor.
    const hash = location.hash.slice(1) as SheetId;
    let land = 0;
    if (sheets.includes(hash)) {
      land = requestAnimationFrame(() => {
        land = requestAnimationFrame(() => {
          landOnSheet(hash);
          update();
        });
      });
    }
    const observer = new ResizeObserver(() => {
      measureSheets();
      update();
    });
    const main = document.getElementById("main");
    if (main) observer.observe(main);
    ScrollTrigger.addEventListener("refresh", measureSheets);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(land);
      observer.disconnect();
      ScrollTrigger.removeEventListener("refresh", measureSheets);
      window.removeEventListener("scroll", update);
      clearSheets();
    };
  }, []);

  return null;
}
