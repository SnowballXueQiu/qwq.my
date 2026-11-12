import type Lenis from "lenis";
import type { VirtualScrollData } from "lenis";
import { FLOW, beatTimes } from "@/components/three/world";
import { hasSheets, scrollForSceneTime } from "@/lib/sceneClock";
import { getLenis, scrollToTarget } from "@/lib/scroll";
import { sheets, type SheetId } from "@/lib/sheets";
import { useSite } from "@/lib/store";

/**
 * Scrolling for the home page, in two parts.
 *
 * Up to the road, the film rests on beats (see beatTimes). Scrolling pulls
 * the page toward the next beat against a little resistance; pull far enough
 * and it glides the rest of the way at a fixed eased pace, however hard you
 * scrolled. Let go short of that and it springs back. One gesture moves at
 * most one beat. Anything that leaves the page between beats (the scrubber,
 * a resize) settles onto the nearest one.
 *
 * From the road on (see FLOW) scrolling is continuous and smooth, except that
 * a fling is caught at the writing shot, and the flow never runs back up past
 * its start: the beats take over there.
 */

/** Quiet time (ms) that ends a wheel gesture. */
const GAP = 180;
/** Quiet time (ms) after which a pull that fell short springs back. */
const RELEASE = 420;

/** Wheel scrolling (px) it takes to move on: about three notches of a mouse wheel. */
const wheelThreshold = () => Math.min(300, Math.max(160, innerHeight * 0.26));

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const state = {
  /** performance.now() when the current glide lands. */
  until: 0,
  landTimer: 0,
  /** One more step asked for mid-glide (+1 / −1), taken on landing. */
  queued: 0,
  /** The beat the page rests on, or is gliding to (px). */
  home: 0,
  /** Scrolling (px, signed) gathered toward the next beat, not yet enough to move on. */
  pull: 0,
  releaseTimer: 0,
  wheel: { at: 0, armed: true, peak: 0, low: Infinity },
  touch: null as null | {
    x: number;
    y: number;
    axis: "" | "x" | "y";
    mode: "" | "beat" | "flow";
    /** Page offset when the finger came down. */
    from: number;
    trail: [number, number][];
    fired: boolean;
  },
  pointerDown: false,
  settleTimer: 0,
};

const gliding = () => performance.now() < state.until;

function active(lenis: Lenis | null): lenis is Lenis {
  return !!lenis && hasSheets() && !lenis.isStopped && !useSite.getState().reading;
}

const toY = (lenis: Lenis, s: number) => Math.min(Math.round(scrollForSceneTime(s)), lenis.limit);

/** Beat positions in px, ascending, within the scrollable range. */
const beatYs = (lenis: Lenis) => beatTimes().map((s) => toY(lenis, s));

const nearestBeat = (lenis: Lenis) => {
  const y = lenis.animatedScroll;
  return beatYs(lenis).reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
};

/** The next beat past `from` in `dir`, if there is one. */
const nextBeat = (lenis: Lenis, from: number, dir: number) => {
  const ys = beatYs(lenis);
  return dir > 0 ? ys.find((b) => b > from + 2) : ys.findLast((b) => b < from - 2);
};

/** Whether scrolling from `y` in `dir` is continuous: inside the flow, or into it from its start. */
function flowing(lenis: Lenis, y: number, dir: number) {
  const start = toY(lenis, FLOW.start);
  return y > start + 2 || (y >= start - 2 && dir > 0);
}

/**
 * Where continuous scrolling from `from` toward `to` stops: never above the
 * flow's start, and caught at the writing shot when it would run past it.
 */
function flowTarget(lenis: Lenis, from: number, to: number): { y: number; caught: boolean } {
  const start = toY(lenis, FLOW.start);
  if (to < start) return { y: start, caught: true };
  for (const c of FLOW.catches.map((s) => toY(lenis, s))) {
    if ((from - c) * (to - c) < 0) return { y: c, caught: true };
  }
  return { y: Math.min(to, lenis.limit), caught: false };
}

/** Halts whatever the page is doing (a glide, a coast) where it is. */
const halt = (lenis: Lenis) => (lenis as unknown as { reset(): void }).reset();

function glide(lenis: Lenis, y: number, duration?: number) {
  // Longer moves (the hero, the map) take a little longer, but never drag.
  const d = Math.abs(y - lenis.animatedScroll) / innerHeight;
  duration ??= Math.min(1.6, Math.max(0.85, 0.55 + 0.5 * d));
  state.home = y;
  state.until = performance.now() + duration * 1000;
  lenis.scrollTo(y, { duration, easing: easeInOut, force: true });
  window.clearTimeout(state.landTimer);
  state.landTimer = window.setTimeout(() => {
    state.until = 0;
    const q = state.queued;
    state.queued = 0;
    // Landed at the road with another push waiting: roll on into the flow.
    if (q && flowing(lenis, lenis.animatedScroll, q)) coast(lenis, q * innerHeight * 0.6);
    else if (q) step(lenis, q);
  }, duration * 1000 + 40);
}

/** One beat down (+1) or up (−1) from `from`. Mid-glide, it waits for the landing. */
function step(lenis: Lenis, dir: number, from = lenis.animatedScroll) {
  if (gliding()) {
    state.queued = dir;
    return;
  }
  const next = nextBeat(lenis, from, dir);
  if (next !== undefined) glide(lenis, next);
}

/** Continuous scrolling by `delta` px inside the flow, eased out. */
function coast(lenis: Lenis, delta: number) {
  const from = lenis.targetScroll;
  const { y } = flowTarget(lenis, from, from + delta);
  const duration = Math.min(1.2, Math.max(0.5, 0.5 + (Math.abs(y - from) / innerHeight) * 0.35));
  lenis.scrollTo(y, { duration, easing: easeOut, force: true });
}

/** Starts a pull from the beat the page is resting on. */
function beginPull(lenis: Lenis) {
  if (!gliding() && state.pull === 0) state.home = nearestBeat(lenis);
}

/** Leans the page toward the next beat by the pull, with resistance; nothing to lean toward past the ends. */
function showPull(lenis: Lenis) {
  if (gliding()) return;
  const dir = Math.sign(state.pull);
  const next = dir ? nextBeat(lenis, state.home, dir) : undefined;
  const room = next === undefined ? 0 : Math.min(Math.abs(next - state.home) * 0.4, innerHeight * 0.16);
  const lean = room ? dir * room * (1 - Math.exp((-Math.abs(state.pull) * 0.5) / room)) : 0;
  lenis.scrollTo(state.home + lean, { lerp: 0.2, force: true });
}

/** A pull that fell short goes back where it came from. */
function springBack(lenis: Lenis) {
  window.clearTimeout(state.releaseTimer);
  if (state.pull === 0) return;
  state.pull = 0;
  if (!gliding()) glide(lenis, state.home, 0.45);
}

const dropPull = () => {
  window.clearTimeout(state.releaseTimer);
  state.pull = 0;
};

/** Moves on in the pull's direction (from the beat it started at). */
function commitPull(lenis: Lenis) {
  const dir = Math.sign(state.pull);
  dropPull();
  step(lenis, dir, state.home);
}

function onWheel(lenis: Lenis, event: WheelEvent, dy: number) {
  const now = performance.now();
  const w = state.wheel;
  if (now - w.at > GAP) Object.assign(w, { armed: true, peak: 0, low: Infinity });
  w.at = now;
  const m = Math.abs(dy);
  // One gesture, one step: a long spin of the wheel or a trackpad's inertia
  // tail is swallowed once it has moved on (or been caught). A fresh push
  // during the tail (it dies away, then surges) counts as a new gesture.
  w.peak = Math.max(w.peak, m);
  if (m < w.peak * 0.5) w.low = Math.min(w.low, m);
  if (!w.armed && w.low < Infinity && m > w.low * 2.5 && m > 12) Object.assign(w, { armed: true, peak: m, low: Infinity });

  if (w.armed && !gliding() && flowing(lenis, lenis.targetScroll, Math.sign(dy))) {
    dropPull();
    const from = lenis.targetScroll;
    const { y, caught } = flowTarget(lenis, from, from + dy);
    // Plain scrolling: Lenis smooths it as usual.
    if (!caught) return true;
    w.armed = false;
    lenis.scrollTo(y, { programmatic: false, lerp: lenis.options.lerp, force: true });
  }
  if (event.cancelable) event.preventDefault();
  if (!w.armed) return false;
  beginPull(lenis);
  state.pull += dy;
  if (Math.abs(state.pull) >= wheelThreshold()) {
    w.armed = false;
    commitPull(lenis);
    return false;
  }
  showPull(lenis);
  window.clearTimeout(state.releaseTimer);
  state.releaseTimer = window.setTimeout(() => springBack(lenis), RELEASE);
  return false;
}

function onTouch(lenis: Lenis, event: TouchEvent) {
  const t = event.touches[0] ?? event.changedTouches[0];
  if (!t) return;
  const now = performance.now();
  if (event.type === "touchstart") {
    // A finger on the glass stops a coast where it is.
    if (!gliding() && lenis.animatedScroll > toY(lenis, FLOW.start) + 2) halt(lenis);
    beginPull(lenis);
    state.touch = { x: t.clientX, y: t.clientY, axis: "", mode: "", from: lenis.animatedScroll, trail: [[now, t.clientY]], fired: false };
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
    if (g.fired) return;
    g.trail.push([now, t.clientY]);
    if (g.trail.length > 6) g.trail.shift();
    // Scrolling is the other way round from the finger.
    if (!g.mode) g.mode = !gliding() && flowing(lenis, g.from, -Math.sign(dy)) ? "flow" : "beat";
    if (g.mode === "flow") {
      // The page follows the finger, but not back up past the flow's start.
      lenis.scrollTo(Math.min(Math.max(g.from - dy, toY(lenis, FLOW.start)), lenis.limit), { immediate: true, force: true });
      return;
    }
    // The page leans with the finger.
    state.pull = -dy;
    // A long drag moves on without waiting for the release.
    if (Math.abs(dy) > innerHeight * 0.3) {
      g.fired = true;
      commitPull(lenis);
      return;
    }
    showPull(lenis);
    return;
  }
  state.touch = null;
  if (g.axis !== "y" || g.fired) return;
  const [t0, y0] = g.trail[0];
  const velocity = (t.clientY - y0) / Math.max(now - t0, 1);
  if (g.mode === "flow") {
    // Coast on from the flick, about as far as a native fling.
    const reach = Math.max(-1.6, Math.min(1.6, (-velocity * 380) / innerHeight)) * innerHeight;
    if (Math.abs(reach) > 4) coast(lenis, reach);
    return;
  }
  // Released: far enough, or a real flick, moves on; anything less springs back.
  const far = Math.abs(dy) > Math.max(64, innerHeight * 0.1);
  const flick = Math.abs(velocity) > 0.5 && Math.abs(dy) > Math.max(48, innerHeight * 0.06);
  if (far || flick) commitPull(lenis);
  else springBack(lenis);
}

/** Lenis' virtualScroll hook: returns false where beats take the event over. */
export function beatScroll({ deltaX, deltaY, event }: VirtualScrollData) {
  const lenis = getLenis();
  if (!active(lenis) || event.ctrlKey) return true;
  // Overlays and nested scrollers opt out the same way they do for Lenis.
  if (event.composedPath().some((n) => n instanceof HTMLElement && n.hasAttribute("data-lenis-prevent"))) return true;
  if (event.type === "wheel") {
    if (Math.abs(deltaX) > Math.abs(deltaY)) return true;
    return onWheel(lenis, event as WheelEvent, deltaY);
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
  if (e.key === "Home" || e.key === "End") {
    e.preventDefault();
    dropPull();
    glide(lenis, e.key === "Home" ? 0 : lenis.limit);
    return;
  }
  const page = e.key === "PageDown" || e.key === "PageUp" || e.key === " ";
  let dir = 0;
  if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) dir = 1;
  else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) dir = -1;
  if (!dir) return;
  e.preventDefault();
  if (!gliding() && flowing(lenis, lenis.targetScroll, dir)) {
    coast(lenis, dir * innerHeight * (page ? 0.85 : 0.3));
    return;
  }
  if (!e.repeat || !gliding()) step(lenis, dir);
}

function settle() {
  const lenis = getLenis();
  if (!active(lenis) || gliding() || state.pointerDown || state.touch || state.pull !== 0) return;
  if (lenis.isScrolling) {
    scheduleSettle();
    return;
  }
  // The flow rests wherever it stops.
  if (lenis.animatedScroll > toY(lenis, FLOW.start) + 2) return;
  const nearest = nearestBeat(lenis);
  if (Math.abs(nearest - lenis.animatedScroll) > 2) glide(lenis, nearest);
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
    window.clearTimeout(state.releaseTimer);
  };
}

/** Glides to where a sheet's story starts: its first beat, the writing shot, the end. */
export function scrollToSheet(id: SheetId) {
  const lenis = getLenis();
  if (!active(lenis)) {
    scrollToTarget(`#${id}`);
    return;
  }
  const i = sheets.indexOf(id);
  const s = [...beatTimes(), ...FLOW.catches, FLOW.end].sort((a, b) => a - b).find((b) => b >= i) ?? i;
  state.queued = 0;
  dropPull();
  glide(lenis, toY(lenis, s));
}
