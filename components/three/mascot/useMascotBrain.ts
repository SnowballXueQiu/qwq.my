"use client";

import { useEffect, useMemo, useRef } from "react";
import { on } from "@/lib/fx";
import { sheets } from "@/lib/sheets";
import { useSite, type Expression } from "@/lib/store";

const IDLE_AFTER = 8000;
const DIZZY_SPEED = 2600; // px/s, averaged
const CRY_CLICKS = 5;

/**
 * Decides the mascot's face from what the visitor is doing.
 * Priority: left the window > cried from clicks > dizzy > poked > hovered > asleep > section default.
 */
export function useMascotBrain() {
  const state = useRef({
    hovered: false,
    away: false,
    lastActive: 0,
    pokedUntil: 0,
    cryUntil: 0,
    dizzyUntil: 0,
    clicks: [] as number[],
    speed: 0,
    forced: null as Expression | null,
    forcedUntil: 0,
  });

  useEffect(() => {
    const s = state.current;
    s.lastActive = performance.now();
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    const active = () => {
      s.lastActive = performance.now();
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      const dt = Math.max(now - lastT, 1);
      if (lastT) {
        const v = (Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt) * 1000;
        s.speed += (Math.min(v, 8000) - s.speed) * 0.12;
        if (s.speed > DIZZY_SPEED) s.dizzyUntil = now + 2200;
      }
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      s.away = false;
      active();
    };
    const onLeave = () => {
      s.away = true;
    };
    const onEnter = () => {
      s.away = false;
      active();
    };
    const offFace = on("face", ({ expression, duration = 2.5 }) => {
      s.forced = expression;
      s.forcedUntil = performance.now() + duration * 1000;
    });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", active);
    window.addEventListener("wheel", active, { passive: true });
    window.addEventListener("touchstart", active, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    window.addEventListener("blur", onLeave);
    window.addEventListener("focus", onEnter);
    return () => {
      offFace();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", active);
      window.removeEventListener("wheel", active);
      window.removeEventListener("touchstart", active);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("focus", onEnter);
    };
  }, []);

  // Stable for the component's lifetime: everything reads the ref.
  return useMemo(() => {
    const poke = () => {
      const s = state.current;
      const now = performance.now();
      s.clicks = [...s.clicks.filter((t) => now - t < 3000), now];
      if (s.clicks.length >= CRY_CLICKS) {
        s.cryUntil = now + 3200;
        s.clicks = [];
      } else {
        s.pokedUntil = now + 650;
      }
      s.lastActive = now;
    };

    const setHovered = (hovered: boolean) => {
      state.current.hovered = hovered;
    };

    /** Call once per frame; returns the face to show and updates the store when it changes. */
    const think = (): Expression => {
      const s = state.current;
      const now = performance.now();
      const site = useSite.getState();
      let face: Expression = sheets[site.sheet] === "contact" ? "^w^" : "QwQ";
      if (now - s.lastActive > IDLE_AFTER) face = "-w-";
      if (s.hovered) face = "OwO";
      if (now < s.pokedUntil) face = ">w<";
      if (now < s.dizzyUntil) face = "@w@";
      if (now < s.cryUntil || s.away) face = "QAQ";
      if (s.forced && now < s.forcedUntil) face = s.forced;
      if (face !== site.expression) site.setExpression(face);
      return face;
    };

    return { poke, setHovered, think };
  }, []);
}
