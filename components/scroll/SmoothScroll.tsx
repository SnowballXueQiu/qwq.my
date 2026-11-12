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
