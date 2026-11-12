"use client";

import { useEffect } from "react";
import { emit } from "@/lib/fx";
import { prefersReducedMotion } from "@/lib/scroll";
import { useSite } from "@/lib/store";
import { postFx } from "../pipeline/InkPipeline";
import { frameState } from "../frameState";
import { UI_SELECTOR, pointer, pointerClaimed, pushImpulse } from "./interaction";

/**
 * Turns pointer input into world input: tracks the pointer in NDC, and makes
 * clicks on empty space in the dark world fire an ink shockwave.
 */
export function InteractionBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __qwqFx: unknown }).__qwqFx = { postFx, frameState };
    }
    const toNdc = (e: PointerEvent) => [(e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1] as const;
    const onMove = (e: PointerEvent) => {
      [pointer.x, pointer.y] = toNdc(e);
      pointer.inside = true;
    };
    const onLeave = () => {
      pointer.inside = false;
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || pointerClaimed()) return;
      const html = document.documentElement;
      if (html.classList.contains("menu-open") || html.classList.contains("game-open")) return;
      if ((e.target as Element | null)?.closest(UI_SELECTOR)) return;
      if (useSite.getState().reading || frameState.s < 0.62 || frameState.s > 5.75) return;
      const [x, y] = toNdc(e);
      pushImpulse(x, y, 1);
      if (!prefersReducedMotion()) {
        postFx.shockX = e.clientX / innerWidth;
        postFx.shockY = 1 - e.clientY / innerHeight;
        postFx.shockAt = performance.now();
      }
      emit("sound", { name: "shock" });
    };
    // ↑↑↓↓←→←→BA
    const code = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
    let typed: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as Element | null)?.closest("input, textarea")) return;
      typed = [...typed, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-code.length);
      if (typed.join() === code.join()) {
        typed = [];
        emit("party", { seconds: 9 });
        emit("face", { expression: "^w^", duration: 9 });
        emit("sound", { name: "party" });
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return null;
}
