/** Per-frame values the director computes once and every scene component reads. */
export const frameState = {
  /** Scene time: sheet index + progress through it. */
  s: 0,
  /** Hero choreography, each 0–1. */
  depth: 0,
  breakAmount: 0,
  leap: 0,
  park: 0,
  /** The finale, where everything returns to paper. */
  finale: 0,
  cameraZ: 14,
  /** 0–1: how far the camera has pulled back into the overview map. */
  overview: 0,
  /** 0–1: debug-mode mini game in progress. */
  game: 0,
  /** Smoothed signed scroll velocity and its 0–1 magnitude. */
  velocity: 0,
  speed: 0,
  /** Seconds since the last hard cut (drives punch-ins and shake). */
  sinceCut: 99,
  /** 0–1 while the Konami-code party is on. */
  party: 0,
};

/** In the overview map every set piece shows fully assembled. */
export const withOverview = (p: number) => (frameState.overview > 0.4 ? 1 : p);

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Maps scene time onto a KineticText-style progress:
 * -1 before `inStart`, 0→1 while arriving, 1 while holding, 1→2 while leaving.
 */
export function cue(s: number, inStart: number, inEnd: number, outStart: number, outEnd: number) {
  if (s < inStart) return -1;
  if (s < inEnd) return (s - inStart) / (inEnd - inStart);
  if (s < outStart) return 1;
  return 1 + Math.min((s - outStart) / (outEnd - outStart), 1.001);
}
