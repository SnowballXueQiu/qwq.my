import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { timeline } from "@/content/timeline";
import { HOLD_IN, HOLD_OUT, TIMELINE_SLOTS, pinned } from "@/lib/sheetLengths";

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

/** The footprints map, off to the side of init(me). */
const MAP = { x: -27, y: -3, z: -54 };

export const WORLD = {
  about: { z: -46, map: MAP },
  skills: { start: S_START, end: S_END, spacing: S_SPACING, count: skillGroups.length },
  projects: { start: P_START, spacing: P_SPACING, side: 4.4, count: projectCount },
  timeline: { start: T_START, end: T_END, plazaZ: PLAZA_Z },
  writing: { z: W_Z },
  contact: { z: C_Z },
};

/** Scene-time beats of the footprints map in the about sheet. */
export const MAP_S = { arrive: 1.5, hold: 1.72, leave: 1.94 };

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
 * Where scrolling comes to rest, in scene time, up to the timeline: one beat
 * per shot (each skill card and project screen gets its own). A wheel flick,
 * a swipe or an arrow key moves exactly one beat, however hard it is, so the
 * ride never races past a stop. The last beat is where the road begins.
 */
export function beatTimes(): number[] {
  const slot = (id: "skills" | "projects", n: number) => pinned(id) / n;
  return [
    0,
    // The sheet has torn and the toys are out.
    0.68,
    // init(me).
    1.3,
    (MAP_S.hold + MAP_S.leave) / 2,
    ...skillGroups.map((_, i) => 2 + slot("skills", skillGroups.length) * (i + 0.5)),
    ...projects.map((_, i) => 3 + slot("projects", projectCount) * (i + 0.5)),
    FLOW.start,
  ];
}

/**
 * From the first milestone to the end of the page, scrolling is continuous:
 * the ride down the road, the city, writing, contact. A hard fling is caught
 * at the writing shot rather than running on to the end.
 */
export const FLOW = { start: 4 + T_SLOT * 0.5, catches: [5.3], end: 6 + pinned("contact") };

/**
 * Where milestone `i` of `n` stands: a little ahead of where the camera is
 * while that milestone is the current one, so it sits in frame as you read.
 */
export function milestoneZ(i: number, n: number) {
  return T_START - 4 - (T_START - T_END - 4) * (i / Math.max(n - 1, 1));
}

/** Sideways sway of the timeline road at a given z. */
export const roadX = (z: number) => Math.sin((z - T_START) * 0.045) * 3.2;

/** `portrait`: phones look straight down the road at exhibit stops (there is no side panel to clear). */
export function buildCameraKeys(portrait = false): CameraKey[] {
  const keys: CameraKey[] = [
    { s: 0, pos: [0, 0, 14], look: [0, 0, 0] },
    // Hold after the tear so there's time to play with the toys that burst out.
    { s: 0.78, pos: [0, 0, 14], look: [0, 0, 0] },
    { s: 1.0, pos: [0, 0, -14], look: [0, 0, WORLD.about.z] },
    { s: 1.29, pos: [3.6, 1.3, -28], look: [0, 0, WORLD.about.z], roll: -7 },
    { s: 1.56, pos: [-1.2, 0.4, -33], look: [0, 0, WORLD.about.z], roll: 9 },
    // Footprints: turn and look down on the map while the about panel scrolls away.
    ...(portrait
      ? [
          // High enough that the whole country fits a phone's width, and a little north so the title fits above.
          { s: MAP_S.hold, pos: [MAP.x, MAP.y + 64, MAP.z + 8.3] as V3, look: [MAP.x, MAP.y, MAP.z - 2.2] as V3, roll: 0 },
          { s: MAP_S.leave, pos: [MAP.x, MAP.y + 64, MAP.z + 8.3] as V3, look: [MAP.x, MAP.y, MAP.z - 2.2] as V3, roll: 0 },
        ]
      : [
          // Looking a little west of centre puts the map on the right, clear of the panels on the left.
          { s: MAP_S.hold, pos: [MAP.x - 3.5, MAP.y + 18.5, MAP.z + 18.5] as V3, look: [MAP.x - 3.5, MAP.y, MAP.z + 1] as V3, roll: 0 },
          { s: MAP_S.leave, pos: [MAP.x - 2.9, MAP.y + 18, MAP.z + 18] as V3, look: [MAP.x - 3.5, MAP.y, MAP.z + 1] as V3, roll: 0 },
        ]),
  ];
  // Skills: glide level and calm past one station per group, so the type stays legible.
  for (let i = 0; i < skillGroups.length; i++) {
    const z = S_START - S_SPACING * i;
    // Stations share the stretch where the skills panel is pinned:
    // arrive, hold while you read, then move on.
    const slot = pinned("skills") / skillGroups.length;
    const station = { pos: [1.2, 0.3, z + 17.5] as V3, look: [3.6, 0.2, z - 4] as V3, roll: 0 };
    keys.push({ s: 2 + slot * (i + HOLD_IN), ...station }, { s: 2 + slot * (i + HOLD_OUT), ...station });
  }
  for (let i = 0; i < projectCount; i++) {
    const z = P_START - P_SPACING * i;
    const side = i % 2 === 0 ? 1 : -1;
    // A phone is too narrow for the angled view: stand square to the screen, far enough back to
    // take in all of it, and keep it above the readout card at the bottom.
    const stop = portrait
      ? { pos: [side * 1.8, 0.6, z + 21.5] as V3, look: [side * WORLD.projects.side, -2.2, z] as V3, roll: 0 }
      : { pos: [-side * 1.4, 0.6, z + 10] as V3, look: [side * WORLD.projects.side * 0.85, 0, z] as V3, roll: -side * 6 };
    const slot = pinned("projects") / projectCount;
    keys.push({ s: 3 + slot * (i + HOLD_IN), ...stop }, { s: 3 + slot * (i + HOLD_OUT), ...stop });
  }
  // Timeline: one unbroken ride down the road, turning toward each milestone
  // (sign on the verge, exhibit in the middle of the road when there is one)
  // as it passes, then rising over the contribution plaza.
  const tSlot = T_SLOT;
  timeline.forEach((event, i) => {
    const z = milestoneZ(i, timeline.length);
    const side = i % 2 === 0 ? -1 : 1;
    // Stand on the road's centre line at this stop (not where the bend puts us),
    // so both verges are framed evenly.
    const cx = roadX(z);
    const look: V3 = event.media && !portrait ? [roadX(z - 3) - side * 1.6, 1.7, z - 3] : event.media ? [roadX(z - 3), 1.9, z - 3] : [cx, 0.6, z - 18];
    const at = (camZ: number): Omit<CameraKey, "s"> => ({
      pos: [cx, 2.2, camZ],
      look,
      // Lean into the bends like a motorbike.
      roll: (roadX(camZ - 8) - roadX(camZ)) * 4,
    });
    keys.push({ s: 4 + tSlot * (i + 0.5), ...at(z + 14) });
  });
  // The GitHub city: roll up to the foot of the towers looking up at them,
  // then crane up and back until the whole year reads as the familiar grid.
  const px = roadX(PLAZA_Z);
  const n = timeline.length;
  keys.push(
    { s: 4 + tSlot * (n + 0.1), pos: [px, 1.3, PLAZA_Z + 24], look: [px, 7, PLAZA_Z], roll: 0 },
    { s: 4 + tSlot * (n + 0.75), pos: [px + 1.5, 1.5, PLAZA_Z + 13], look: [px + 1, 9, PLAZA_Z - 2], roll: -4 },
    { s: 4 + tSlot * (n + 1.1), pos: [px + 6, 18, PLAZA_Z + 30], look: [px + 2, 0, PLAZA_Z], roll: 0 },
  );
  if (portrait) {
    // A narrow screen can't hold the whole year at once: fly over it, January to November.
    keys.push(
      { s: 4 + tSlot * (n + 1.4), pos: [px - 19, 36, PLAZA_Z + 36], look: [px - 19, -6, PLAZA_Z + 1], roll: 0 },
      { s: 4 + tSlot * (n + 1.95), pos: [px + 19, 36, PLAZA_Z + 36], look: [px + 19, -6, PLAZA_Z + 1], roll: 0 },
    );
  } else {
    keys.push(
      // Still drifting up while the year reads, so the ride never stalls.
      { s: 4 + tSlot * (n + 1.45), pos: [px + 2, 50, PLAZA_Z + 52], look: [px + 2, -4, PLAZA_Z + 4], roll: 0 },
      { s: 4 + tSlot * (n + 1.95), pos: [px + 2, 54, PLAZA_Z + 56], look: [px + 2, -4, PLAZA_Z + 3], roll: 0 },
    );
  }
  keys.push(
    { s: 5.35, pos: [2.2, 0.6, W_Z + 13], look: [0, 0, W_Z], roll: 5 },
    { s: 5.92, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
    { s: 7, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z], roll: 0 },
  );
  return keys;
}
