/**
 * The promo's edit: 60 fps, cut on the bar grid of the soundtrack
 * (remotion/Promo/music/compose.mjs, 120 BPM: a bar is 120 frames).
 * Three minutes exactly.
 */
export const FPS = 60;
export const BEAT = 30;
export const BAR = 120;
export const BARS = 90;
export const DURATION = BARS * BAR;

/** Sections in bars, [start, end). Keep in sync with SECTIONS in compose.mjs. */
export const SECTIONS = {
  hook: [0, 4],
  draw: [4, 10],
  wake: [10, 16],
  tear: [16, 20],
  pano: [20, 30],
  tour: [30, 54],
  dual: [54, 62],
  lang: [62, 66],
  eggs: [66, 74],
  cta: [74, 86],
  end: [86, 90],
} as const;

export type SectionName = keyof typeof SECTIONS;
export const from = (s: SectionName) => SECTIONS[s][0] * BAR;
export const len = (s: SectionName) => (SECTIONS[s][1] - SECTIONS[s][0]) * BAR;

/** `sudo rm -rf /` lands on this bar: the music stops dead for one bar. */
export const CRASH_BAR = 69;
