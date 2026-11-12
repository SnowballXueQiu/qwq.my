"use client";

import { useEffect, useState } from "react";
import { getSceneTime } from "@/lib/sceneClock";
import { itemAt } from "@/lib/sheetLengths";
import { sheets, type SheetId } from "@/lib/sheets";

/** Index of the item the camera is passing within a sheet that lays `count` items along its length. */
export function useSceneIndex(sheet: SheetId, count: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const base = sheets.indexOf(sheet);
    const update = () => {
      const s = getSceneTime() - base;
      const i = itemAt(sheet, s, count);
      setIndex((prev) => (prev === i ? prev : i));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [sheet, count]);
  return index;
}
