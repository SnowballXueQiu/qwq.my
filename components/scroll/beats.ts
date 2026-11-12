import type Lenis from "lenis";
import type { VirtualScrollData } from "lenis";
import { beatTimes } from "@/components/three/world";
import { hasSheets, scrollForSceneTime } from "@/lib/sceneClock";
import { getLenis, scrollToTarget } from "@/lib/scroll";
import { sheets, type SheetId } from "@/lib/sheets";
import { useSite } from "@/lib/store";

/**
 * Beat scrolling for the home page. The film rests on beats (see beatTimes);
 * a wheel gesture, a swipe or an arrow key glides exactly one beat on, at a
 * fixed eased pace, however hard you scroll. Anything that leaves the page
 * between beats (the scrubber, a resize) settles onto the nearest one.
 */

/** Quiet time (ms) that ends a wheel gesture. */
const GAP = 180;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const state = {
  /** performance.now() when the current glide lands. */
  until: 0,
  landTimer: 0,
  /** One more step asked for mid-glide (+1 / −1), taken on landing. */
  queued: 0,
  wheel: { at: 0, armed: true, sum: 0, peak: 0, low: Infinity },
  touch: null as null | { x: number; y: number; t: number; axis: "" | "x" | "y"; fired: boolean },
  pointerDown: false,
  settleTimer: 0,
};

const gliding = () => performance.now() < state.until;

function active(lenis: Lenis | null): lenis is Lenis {
  return !!lenis && hasSheets() && !lenis.isStopped && !useSite.getState().reading;
}

/** Beat positions in px, ascending, within the scrollable range. */
function beatYs(lenis: Lenis) {
  const portrait = innerWidth < innerHeight;
  return beatTimes(portrait).map((s) => Math.min(Math.round(scrollForSceneTime(s)), lenis.limit));
}

function glide(lenis: Lenis, y: number) {
  // Longer moves (the hero, the map) take a little longer, but never drag.
  const d = Math.abs(y - lenis.animatedScroll) / innerHeight;
  const duration = Math.min(1.6, Math.max(0.85, 0.55 + 0.5 * d));
  state.until = performance.now() + duration * 1000;
  lenis.scrollTo(y, { duration, easing: easeInOut, force: true });
  window.clearTimeout(state.landTimer);
  state.landTimer = window.setTimeout(() => {
    state.until = 0;
    const q = state.queued;
    state.queued = 0;
    if (q) step(lenis, q);
  }, duration * 1000 + 40);
}

/** One beat down (+1) or up (−1). Mid-glide, it waits for the landing. */
function step(lenis: Lenis, dir: number) {
  if (gliding()) {
    state.queued = dir;
    return;
  }
  const ys = beatYs(lenis);
  const y = lenis.animatedScroll;
  const next = dir > 0 ? ys.find((b) => b > y + 2) : ys.findLast((b) => b < y - 2);
  if (next !== undefined) glide(lenis, next);
}

function onWheel(lenis: Lenis, event: WheelEvent, dy: number) {
  if (event.cancelable) event.preventDefault();
  const now = performance.now();
  const w = state.wheel;
  if (now - w.at > GAP) Object.assign(w, { armed: true, sum: 0, peak: 0, low: Infinity });
  w.at = now;
  const m = Math.abs(dy);
  // One gesture, one step: a long spin of the wheel or a trackpad's inertia
  // tail is swallowed. A fresh push during the tail (it dies away, then
  // surges) counts as a new gesture.
  w.peak = Math.max(w.peak, m);
  if (m < w.peak * 0.5) w.low = Math.min(w.low, m);
  if (!w.armed && w.low < Infinity && m > w.low * 2.5 && m > 12) Object.assign(w, { armed: true, sum: 0, peak: m, low: Infinity });
  if (!w.armed) return;
  // Ignore the faintest brush of a trackpad.
  w.sum += m;
  if (w.sum < 2.5) return;
  w.armed = false;
  step(lenis, Math.sign(dy));
}

function onTouch(lenis: Lenis, event: TouchEvent) {
  const t = event.touches[0] ?? event.changedTouches[0];
  if (!t) return;
  if (event.type === "touchstart") {
    state.touch = { x: t.clientX, y: t.clientY, t: performance.now(), axis: "", fired: false };
    return;
  }
  const g = state.touch;
  if (!g) return;
  const dx = t.clientX - g.x;
  const dy = t.clientY - g.y;
  if (event.type === "touchmove") {
    if (!g.axis) g.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
    // Sideways drags stay with the page (a code block that scrolls, a toy).
    if (g.axis === "x") return;
    if (event.cancelable) event.preventDefault();
    // Step as soon as the swipe reads clearly, not on release: it feels immediate.
    if (!g.fired && Math.abs(dy) > Math.max(24, innerHeight * 0.04)) {
      g.fired = true;
      step(lenis, dy < 0 ? 1 : -1);
    }
    return;
  }
  // A short, quick flick that never got far still counts.
  if (g.axis === "y" && !g.fired && Math.abs(dy) > 10 && performance.now() - g.t < 300) step(lenis, dy < 0 ? 1 : -1);
  state.touch = null;
}

/** Lenis' virtualScroll hook: returns false where beats take the event over. */
export function beatScroll({ deltaX, deltaY, event }: VirtualScrollData) {
  const lenis = getLenis();
  if (!active(lenis) || event.ctrlKey) return true;
  // Overlays and nested scrollers opt out the same way they do for Lenis.
  if (event.composedPath().some((n) => n instanceof HTMLElement && n.hasAttribute("data-lenis-prevent"))) return true;
  if (event.type === "wheel") {
    if (Math.abs(deltaX) > Math.abs(deltaY)) return true;
    onWheel(lenis, event as WheelEvent, deltaY);
    return false;
  }
  onTouch(lenis, event as TouchEvent);
  return false;
}

function onKey(e: KeyboardEvent) {
  const lenis = getLenis();
  if (!active(lenis) || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  const el = e.target as HTMLElement | null;
  if (el?.closest("input, textarea, select, [contenteditable], [role=slider]")) return;
  // Space presses a focused button or link.
  if (e.key === " " && el?.closest("button, a")) return;
  let dir = 0;
  if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) dir = 1;
  else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) dir = -1;
  else if (e.key === "Home" || e.key === "End") {
    e.preventDefault();
    const ys = beatYs(lenis);
    glide(lenis, e.key === "Home" ? ys[0] : ys[ys.length - 1]);
    return;
  }
  if (!dir) return;
  e.preventDefault();
  if (!e.repeat || !gliding()) step(lenis, dir);
}

function settle() {
  const lenis = getLenis();
  if (!active(lenis) || gliding() || state.pointerDown || state.touch) return;
  if (lenis.isScrolling) {
    scheduleSettle();
    return;
  }
  const y = lenis.scroll;
  const nearest = beatYs(lenis).reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
  if (Math.abs(nearest - y) > 2) glide(lenis, nearest);
}

function scheduleSettle() {
  window.clearTimeout(state.settleTimer);
  state.settleTimer = window.setTimeout(settle, 260);
}

const onPointer = (e: PointerEvent) => {
  state.pointerDown = e.type === "pointerdown";
  if (!state.pointerDown) scheduleSettle();
};

/** Wires keys and settling to a Lenis instance; returns a cleanup. */
export function installBeats(lenis: Lenis) {
  const offScroll = lenis.on("scroll", scheduleSettle);
  window.addEventListener("resize", scheduleSettle);
  window.addEventListener("keydown", onKey);
  for (const type of ["pointerdown", "pointerup", "pointercancel"] as const) window.addEventListener(type, onPointer, true);
  return () => {
    offScroll();
    window.removeEventListener("resize", scheduleSettle);
    window.removeEventListener("keydown", onKey);
    for (const type of ["pointerdown", "pointerup", "pointercancel"] as const) window.removeEventListener(type, onPointer, true);
    window.clearTimeout(state.settleTimer);
    window.clearTimeout(state.landTimer);
  };
}

/** Glides to a sheet's first beat (its top when there are no beats to use). */
export function scrollToSheet(id: SheetId) {
  const lenis = getLenis();
  if (!active(lenis)) {
    scrollToTarget(`#${id}`);
    return;
  }
  const i = sheets.indexOf(id);
  const portrait = innerWidth < innerHeight;
  const s = beatTimes(portrait).find((b) => b >= i) ?? i;
  state.queued = 0;
  glide(lenis, Math.min(scrollForSceneTime(s), lenis.limit));
}
