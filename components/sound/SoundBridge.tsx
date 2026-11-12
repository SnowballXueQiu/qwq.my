"use client";

import { useEffect } from "react";
import { on } from "@/lib/fx";
import { initSound, play, wakeSound } from "@/lib/sound";

/** Wires fx events and UI hovers to the synth; wakes audio on the first gesture. */
export function SoundBridge() {
  useEffect(() => {
    initSound();
    const offSound = on("sound", ({ name, intensity }) => play(name, intensity));
    const wake = () => wakeSound();
    let lastTick = 0;
    let lastTarget: Element | null = null;
    const onOver = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest("a, button, [data-cursor]") ?? null;
      if (target && target !== lastTarget && performance.now() - lastTick > 60) {
        lastTick = performance.now();
        play("tick");
      }
      lastTarget = target;
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      offSound();
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerover", onOver);
    };
  }, []);
  return null;
}
