"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSite } from "@/lib/store";

/** Tells the 3D scene whether it is playing the home film or sitting behind a reading page. */
export function RouteSync() {
  const pathname = usePathname();
  useEffect(() => {
    useSite.getState().setReading(!/^\/(zh|en)\/?$/.test(pathname));
  }, [pathname]);
  return null;
}
