import { projects } from "@/content/projects";
import { skills } from "@/content/skills";

type V3 = [number, number, number];
export type CameraKey = { s: number; pos: V3; look: V3 };

/**
 * World layout. Scenes are strung out along -z; the camera flies from the
 * paper (z≈0) through each set piece in scroll order.
 */
const projectCount = projects.length;
const P_START = -150;
const P_SPACING = 18;
const P_END = P_START - P_SPACING * (projectCount - 1);
const T_START = P_END - 28;
const T_END = T_START - 96;
const W_Z = T_END - 34;
const C_Z = W_Z - 46;

export const WORLD = {
  about: { z: -46 },
  skills: { start: -70, end: -70 - Math.max(skills.length - 1, 1) * 6.5, radius: 5.4 },
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
    { s: 0.55, pos: [0, 0, 14], look: [0, 0, 0] },
    { s: 1.0, pos: [0, 0, -14], look: [0, 0, WORLD.about.z] },
    { s: 1.45, pos: [3.6, 1.3, -28], look: [0, 0, WORLD.about.z] },
    { s: 1.78, pos: [-1.2, 0.4, -33], look: [0, 0, WORLD.about.z] },
    { s: 2.0, pos: [0, 0, WORLD.skills.start + 8], look: [0, 0, WORLD.skills.start - 30] },
    { s: 2.92, pos: [0, 0, WORLD.skills.end - 6], look: [0, 0, WORLD.skills.end - 40] },
  ];
  for (let i = 0; i < projectCount; i++) {
    const z = P_START - P_SPACING * i;
    const side = i % 2 === 0 ? 1 : -1;
    keys.push({
      s: 3 + (i + 0.5) / projectCount,
      pos: [-side * 1.4, 0.6, z + 10],
      look: [side * WORLD.projects.side * 0.85, 0, z],
    });
  }
  const roadKeys = 5;
  for (let i = 0; i <= roadKeys; i++) {
    const t = i / roadKeys;
    const z = T_START + 6 - (T_START - T_END + 6) * t;
    keys.push({
      s: 4.05 + t * 0.9,
      pos: [roadX(z), 2.4, z],
      look: [roadX(z - 22), 0.4, z - 22],
    });
  }
  keys.push(
    { s: 5.3, pos: [2.2, 0.6, W_Z + 13], look: [0, 0, W_Z] },
    { s: 5.82, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z] },
    { s: 7, pos: [0, 0, C_Z + 14], look: [0, 0, C_Z] },
  );
  return keys;
}
