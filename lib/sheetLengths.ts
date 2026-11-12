import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { timeline } from "@/content/timeline";
import type { SheetId } from "./sheets";

/** Scroll length of each home sheet, in viewport heights. */
export const SHEET_LENGTH: Record<SheetId, number> = {
  hero: 3,
  about: 2.4,
  skills: Math.max(3, skillGroups.length * 0.6),
  projects: Math.max(3, projects.length * 0.9),
  timeline: Math.max(3, timeline.length * 0.7),
  writing: 1.6,
  contact: 1.8,
};

/**
 * Fraction of a sheet's scroll during which its sticky content is pinned. A
 * sticky block lets go one viewport before its section ends, so anything
 * paced "per item" (stations, monoliths, milestones) must fit inside this.
 */
export const pinned = (id: SheetId) => (SHEET_LENGTH[id] - 1) / SHEET_LENGTH[id];

/** Which of `count` items is current at fraction `f` through a sheet. */
export const itemAt = (id: SheetId, f: number, count: number) =>
  Math.min(count - 1, Math.max(0, Math.floor((f / pinned(id)) * count)));
