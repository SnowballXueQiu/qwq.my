import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { pinned } from "@/lib/sheetLengths";

type V3 = [number, number, number];
/** `roll` is the dutch angle in degrees. */
export type CameraKey = { s: number; pos: V3; look: V3; roll?: number };

/**
 * World layout. Scenes are strung out along -z; the camera flies from the
 * paper (z≈0) through each set piece in scroll order.
 */
const projectCount = projects.length;
/** Skills: one station per group, evenly spaced. */
const S_START = -72;
const S_SPACING = 16;
const S_END = S_START - S_SPACING * (skillGroups.length - 1);
const P_START = S_END - 40;
const P_SPACING = 18;
const P_END = P_START - P_SPACING * (projectCount - 1);
const T_START = P_END - 28;
const T_END = T_START - 96;
const W_Z = T_END - 34;
const C_Z = W_Z - 46;

export const WORLD = {
  about: { z: -46 },
  skills: { start: S_START, end: S_END, spacing: S_SPACING, count: skillGroups.length },
  projects: { start: P_START, spacing: P_SPACING, side: 4.4, count: projectCount },
  timeline: { start: T_START, end: T_END },
  writing: { z: W_Z },
  contact: { z: C_Z },
};

/** Sideways sway of the timeline road at a given z. */
export const roadX = (z: number) => Math.sin((z - T_START) * 0.045) * 3.2;

export function buildCameraKeys(): CameraKey[] {
  const keys: CameraKey[] = [
    { s: 0, pos: [0, 0, 14], look: [0, 0, 0] },
    // Hold after the tear so there's time to play with the toys that burst out.
    { s: 0.78, pos: [0, 0, 14], look: [0, 0, 0] },
    { s: 1.0, pos: [0, 0, -14], look: [0, 0, WORLD.about.z] },
    { s: 1.45, pos: [3.6, 1.3, -28], look: [0, 0, WORLD.about.z], roll: -7 },
    { s: 1.78, pos: [-1.2, 0.4, -33], look: [0, 0, WORLD.about.z], roll: 9 },
  ];
  // Skills: glide level and calm past one station per group, so the type stays legible.
  for (let i = 0; i < skillGroups.length; i++) {
    const z = S_START - S_SPACING * i;
    // Stations share the stretch where the skills panel is pinned:
    // arrive, hold while you read, then move on.
    const slot = pinned("skills") / skillGroups.length;
    const station = { pos: [1.2, 0.3, z + 17.5] as V3, look: [3.6, 0.2, z - 4] as V3, roll: 0 };
    keys.push({ s: 2 + slot * (i + 0.12), ...station }, { s: 2 + slot * (i + 0.88), ...station });
  }
  for (let i = 0; i < projectCount; i++) {
    const z = P_START - P_SPACING * i;
    const side = i % 2 === 0 ? 1 : -1;
    const stop = { pos: [-side * 1.4, 0.6, z + 10] as V3, look: [side * WORLD.projects.side * 0.85, 0, z] as V3, roll: -side * 6 };
    const slot = pinned("projects") / projectCount;
    keys.push({ s: 3 + slot * (i + 0.15), ...stop }, { s: 3 + slot * (i + 0.85), ...stop });
  }
  const roadKeys = 5;
  for (let i = 0; i <= roadKeys; i++) {
    const t = i / roadKeys;
    const z = T_START + 6 - (T_START - T_END + 6) * t;
    keys.push({
      s: 4.02 + t * (pinned("timeline") - 0.02),
      pos: [roadX(z), 2.4, z],
      look: [roadX(z - 22), 0.4, z - 22],
      // Lean into the bends like a motorbike.
      roll: (roadX(z - 8) - roadX(z)) * 4,
    });
  }
  keys.push(
    { s: 5.35, pos: [2.2, 0.6, W_Z + 13], look: [0, 0, W_Z], roll: 5 },
    { s: 5.92, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
    { s: 7, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
  );
  return keys;
}
