import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { timeline } from "@/content/timeline";
import type { SheetId } from "./sheets";

/**
 * One stop per milestone, then two for the GitHub city at the end of the road:
 * drive in among the towers, then crane up over the grid.
 */
export const TIMELINE_SLOTS = timeline.length + 2;

/**
 * One pace for every "stop" on the ride (skill cards, project screens,
 * milestones), in viewport heights of scrolling: how long the camera holds at
 * a stop, and how long the move to the next one takes. Sections with more
 * stops are simply longer, so the speed feels the same everywhere.
 */
export const PACE = { hold: 0.32, move: 0.4 };
const perStop = PACE.hold + PACE.move;
/** Where in a stop's slot the hold begins and ends (the move takes the rest). */
export const HOLD_IN = PACE.move / 2 / perStop;
export const HOLD_OUT = 1 - HOLD_IN;

/** A sticky section pins for (length − 1) viewports; fill exactly that with stops. */
const lengthFor = (stops: number) => Math.max(3, 1 + stops * perStop);

/** Scroll length of each home sheet, in viewport heights. */
export const SHEET_LENGTH: Record<SheetId, number> = {
  hero: 3,
  about: 2.4,
  skills: lengthFor(skillGroups.length),
  projects: lengthFor(projects.length),
  timeline: lengthFor(TIMELINE_SLOTS),
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
