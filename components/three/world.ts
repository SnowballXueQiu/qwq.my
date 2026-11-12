import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { TIMELINE_SLOTS, pinned } from "@/lib/sheetLengths";

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
/** The GitHub contribution city where the road ends. */
const PLAZA_Z = T_END - 40;
const W_Z = PLAZA_Z - 70;
const C_Z = W_Z - 46;

export const WORLD = {
  about: { z: -46 },
  skills: { start: S_START, end: S_END, spacing: S_SPACING, count: skillGroups.length },
  projects: { start: P_START, spacing: P_SPACING, side: 4.4, count: projectCount },
  timeline: { start: T_START, end: T_END, plazaZ: PLAZA_Z },
  writing: { z: W_Z },
  contact: { z: C_Z },
};

/** Scene-time beats of the GitHub city: arriving at street level, then fully overhead. */
const T_SLOT = pinned("timeline") / TIMELINE_SLOTS;
export const PLAZA_S = {
  /** Camera reaches the foot of the towers. */
  street: 4 + T_SLOT * (timeline.length + 0.1),
  /** Camera has finished craning up; the grid reads from above. */
  overhead: 4 + T_SLOT * (timeline.length + 1.45),
  end: 4 + T_SLOT * TIMELINE_SLOTS,
};

/**
 * Where milestone `i` of `n` stands: a little ahead of where the camera is
 * while that milestone is the current one, so it sits in frame as you read.
 */
export function milestoneZ(i: number, n: number) {
  return T_START - 4 - (T_START - T_END - 4) * (i / Math.max(n - 1, 1));
}

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
  // Timeline: stop at each milestone (sign on the verge, exhibit in the middle
  // of the road when there is one), then rise over the contribution plaza.
  const tSlot = T_SLOT;
  timeline.forEach((event, i) => {
    const z = milestoneZ(i, timeline.length);
    const side = i % 2 === 0 ? -1 : 1;
    // Stand on the road's centre line at this stop (not where the bend puts us),
    // so both verges are framed evenly.
    const cx = roadX(z);
    const look: V3 = event.media ? [roadX(z - 3) - side * 1.6, 1.7, z - 3] : [cx, 0.6, z - 18];
    const at = (camZ: number): Omit<CameraKey, "s"> => ({
      pos: [cx, 2.2, camZ],
      look,
      // Lean into the bends like a motorbike.
      roll: (roadX(camZ - 8) - roadX(camZ)) * 4,
    });
    keys.push({ s: 4 + tSlot * (i + 0.15), ...at(z + 15) }, { s: 4 + tSlot * (i + 0.85), ...at(z + 13) });
  });
  // The GitHub city: roll up to the foot of the towers looking up at them,
  // then crane up and back until the whole year reads as the familiar grid.
  const px = roadX(PLAZA_Z);
  const n = timeline.length;
  keys.push(
    { s: 4 + tSlot * (n + 0.1), pos: [px, 1.3, PLAZA_Z + 24], look: [px, 7, PLAZA_Z], roll: 0 },
    { s: 4 + tSlot * (n + 0.75), pos: [px + 1.5, 1.5, PLAZA_Z + 13], look: [px + 1, 9, PLAZA_Z - 2], roll: -4 },
    { s: 4 + tSlot * (n + 1.1), pos: [px + 6, 18, PLAZA_Z + 30], look: [px + 2, 0, PLAZA_Z], roll: 0 },
    { s: 4 + tSlot * (n + 1.45), pos: [px + 2, 50, PLAZA_Z + 52], look: [px + 2, -4, PLAZA_Z + 4], roll: 0 },
    { s: 4 + tSlot * (n + 1.95), pos: [px + 2, 50, PLAZA_Z + 52], look: [px + 2, -4, PLAZA_Z + 4], roll: 0 },
  );
  keys.push(
    { s: 5.35, pos: [2.2, 0.6, W_Z + 13], look: [0, 0, W_Z], roll: 5 },
    { s: 5.92, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
    { s: 7, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
  );
  return keys;
}
