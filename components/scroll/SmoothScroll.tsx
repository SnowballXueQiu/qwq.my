"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { prefersReducedMotion, setLenis } from "@/lib/scroll";
import { useSite } from "@/lib/store";

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

    const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 0.9 });
    setLenis(lenis);
    lenis.on("scroll", () => {
      ScrollTrigger.update();
      updateProgress();
    });
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    updateProgress();

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
