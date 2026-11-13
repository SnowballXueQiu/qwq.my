"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, scrollMotion, setLenis } from "@/lib/scroll";
import { useSite } from "@/lib/store";
import { beatScroll, installBeats } from "./beats";

gsap.registerPlugin(ScrollTrigger);

/** Lenis smooth scrolling driven by the GSAP ticker so ScrollTrigger stays in sync. */
export function SmoothScroll() {
  // The box the browser gives fixed elements (where the drawing frame is drawn). Some phone
  // browsers float their toolbar over the bottom of 100svh; sticky sheets size to this instead
  // so nothing slips under the toolbar or past the frame.
  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;inset:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const fit = () => document.documentElement.style.setProperty("--app-h", `${probe.getBoundingClientRect().height}px`);
    const observer = new ResizeObserver(fit);
    observer.observe(probe);
    fit();
    return () => {
      observer.disconnect();
      probe.remove();
    };
  }, []);

  useEffect(() => {
    const setProgress = useSite.getState().setProgress;
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };

    if (prefersReducedMotion()) {
      window.addEventListener("scroll", updateProgress, { passive: true });
      updateProgress();
      return () => window.removeEventListener("scroll", updateProgress);
    }

    // On the home page, wheel and touch go beat by beat (see beats.ts).
    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9, virtualScroll: beatScroll });
    setLenis(lenis);
    // For poking at it from the console (and recording the blog's clips) in development.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lenis: Lenis }).__lenis = lenis;
    const uninstallBeats = installBeats(lenis);
    lenis.on("scroll", (l: Lenis) => {
      scrollMotion.velocity = l.velocity;
      ScrollTrigger.update();
      updateProgress();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    updateProgress();

    return () => {
      gsap.ticker.remove(tick);
      uninstallBeats();
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
