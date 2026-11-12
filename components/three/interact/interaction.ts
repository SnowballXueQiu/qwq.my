/**
 * Pointer state and click impulses shared by everything in the scene that can
 * be pushed around. Plain data: consumers read it in their frame loops.
 */
export const pointer = { x: 0, y: 0, inside: false };

export type Impulse = { id: number; x: number; y: number; strength: number };

let nextId = 1;
const recent: Impulse[] = [];

export function pushImpulse(x: number, y: number, strength = 1) {
  recent.push({ id: nextId++, x, y, strength });
  if (recent.length > 8) recent.shift();
}

/** Impulses newer than `lastSeen`; returns them and the new watermark. */
export function impulsesSince(lastSeen: number): [Impulse[], number] {
  const fresh = recent.filter((i) => i.id > lastSeen);
  return [fresh, fresh.length ? fresh[fresh.length - 1].id : lastSeen];
}

/** Elements that own their clicks; the world shouldn't react underneath them. */
export const UI_SELECTOR = "a, button, input, textarea, [data-panel], [role='slider'], [role='dialog'], header";

/** A 3D object handled this press itself; world-level click effects should stand down. */
const claim = { at: 0 };
export const claimPointer = () => {
  claim.at = performance.now();
};
export const pointerClaimed = () => performance.now() - claim.at < 60;
