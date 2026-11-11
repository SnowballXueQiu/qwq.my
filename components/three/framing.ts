import type { PerspectiveCamera } from "three";

export const HERO_DIST = 14;
export const PAPER_DIST = 14.6;

/** Half-extents of the view frustum at a distance from the camera. */
export function frustumAt(camera: PerspectiveCamera, dist: number, aspect: number) {
  const halfH = Math.tan((camera.fov * Math.PI) / 360) * dist;
  return { halfW: halfH * aspect, halfH };
}

/** Where the mascot sits in camera space on a paper scene, plus its base scale. */
export function heroPlacement(camera: PerspectiveCamera, aspect: number) {
  const { halfW, halfH } = frustumAt(camera, HERO_DIST, aspect);
  const portrait = aspect < 1;
  const scale = portrait ? (halfW * 2) / 8.2 : Math.min((halfH * 2) / 8.6, (halfW * 2) / 16.5);
  const x = portrait ? 0 : halfW * 0.4;
  const y = portrait ? halfH * 0.32 : halfH * 0.16;
  return { x, y, scale };
}
