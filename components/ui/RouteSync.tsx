"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { emit, on } from "@/lib/fx";
import { useSite } from "@/lib/store";

/**
 * Tells the 3D scene whether it is playing the home film or sitting behind a reading page,
 * and opens the pages the scene asks for (a post's sheet in the writing scene).
 */
export function RouteSync() {
  const pathname = usePathname();
  const router = useRouter();
  const first = useRef(true);
  useEffect(() => on("go", ({ href }) => router.push(href)), [router]);
  useEffect(() => {
    useSite.getState().setReading(!/^\/(zh|en)\/?$/.test(pathname));
    // Moving to another page resets the scroll; keep the camera from reading that as a dash.
    if (!first.current) emit("navigate", {});
    first.current = false;
  }, [pathname]);
  return null;
}
