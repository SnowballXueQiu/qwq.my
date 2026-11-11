"use client";

import { useEffect, useRef, useState } from "react";
import { emit, on } from "@/lib/fx";
import { prefersReducedMotion } from "@/lib/scroll";

const LOG = [
  "QwQ BIOS v2.6  ·  qwq.my",
  "[ ok ] mounting /dev/paper",
  "[ ok ] loading typefaces ........ 2",
  "[ ok ] compiling ink shaders .... sobel · halftone · hatch",
  "[ ok ] cutting voronoi shards ... 170",
  "[ ok ] waking QwQ ............... (◉w◉)",
  "> init(me);",
];

const SESSION_KEY = "qwq-booted";

/**
 * The boot log: shown once per session while the scene warms up, and again
 * after a crash. It waits for the canvas, but never longer than a few seconds.
 */
export function BootScreen() {
  const [visible, setVisible] = useState(true);
  const [count, setCount] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const sceneReady = useRef(false);

  useEffect(() => {
    const offReady = on("sceneReady", () => {
      sceneReady.current = true;
    });
    return offReady;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const play = async (force: boolean) => {
      if (!force && sessionStorage.getItem(SESSION_KEY)) {
        setVisible(false);
        return;
      }
      setVisible(true);
      setLeaving(false);
      setCount(0);
      const step = prefersReducedMotion() ? 0 : 150;
      for (let i = 1; i <= LOG.length && !cancelled; i++) {
        await new Promise((r) => setTimeout(r, step));
        setCount(i);
      }
      const deadline = performance.now() + 3500;
      while (!sceneReady.current && performance.now() < deadline && !cancelled) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (cancelled) return;
      sessionStorage.setItem(SESSION_KEY, "1");
      setLeaving(true);
      emit("flash", { duration: 0.1 });
      setTimeout(() => !cancelled && setVisible(false), 450);
    };
    void play(false);
    const offReboot = on("reboot", () => {
      window.scrollTo(0, 0);
      void play(true);
    });
    return () => {
      cancelled = true;
      offReboot();
    };
  }, []);

  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[95] flex items-end bg-[#141414] p-[8vw] font-mono text-[13px] text-[#f1ede4] transition-[clip-path] duration-[450ms] ease-[steps(6)]"
      style={{ clipPath: leaving ? "inset(0 0 100% 0)" : "inset(0 0 0 0)" }}
    >
      <div className="space-y-1">
        {LOG.slice(0, count).map((line, i) => (
          <p key={i} className={line.startsWith(">") ? "text-[#e8402a]" : i === 0 ? "text-[#f1ede4]" : "text-[#f1ede4]/70"}>
            {line}
          </p>
        ))}
        <p className="inline-block h-4 w-2 animate-pulse bg-[#e8402a]" />
      </div>
    </div>
  );
}
