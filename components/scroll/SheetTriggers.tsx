"use client";

import { useEffect } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clearSheets, getSceneTime, measureSheets } from "@/lib/sceneClock";
import { sheets } from "@/lib/sheets";
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
    const observer = new ResizeObserver(() => {
      measureSheets();
      update();
    });
    const main = document.getElementById("main");
    if (main) observer.observe(main);
    ScrollTrigger.addEventListener("refresh", measureSheets);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      ScrollTrigger.removeEventListener("refresh", measureSheets);
      window.removeEventListener("scroll", update);
      clearSheets();
    };
  }, []);

  return null;
}
