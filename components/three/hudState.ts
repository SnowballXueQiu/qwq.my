/**
 * Per-frame readouts the 3D scene publishes for the DOM HUD. Plain mutable
 * data: the HUD polls it in its own animation frame, nothing re-renders.
 */
export type ScreenPoint = { x: number; y: number; visible: boolean };

export const hudState = {
  cam: { x: 0, y: 0, z: 14, fov: 35, roll: 0, yaw: 0 },
  fps: 60,
  frame: 0,
  velocity: 0,
  speed: 0,
  sinceCut: 99,
  /** Screen position of the thing the active panel is talking about. */
  anchor: { x: 0, y: 0, visible: false, label: "" },
  /** Screen-space box around QwQ's two eyes, for the hero's dimension lines. */
  eyes: [
    { x: 0, y: 0, r: 0 },
    { x: 0, y: 0, r: 0 },
  ],
  eyesVisible: false,
};
