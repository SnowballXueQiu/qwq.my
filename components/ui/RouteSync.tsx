"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { emit } from "@/lib/fx";
import { useSite } from "@/lib/store";

/** Tells the 3D scene whether it is playing the home film or sitting behind a reading page. */
export function RouteSync() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    useSite.getState().setReading(!/^\/(zh|en)\/?$/.test(pathname));
    // Moving to another page resets the scroll; keep the camera from reading that as a dash.
    if (!first.current) emit("navigate", {});
    first.current = false;
  }, [pathname]);
  return null;
}
