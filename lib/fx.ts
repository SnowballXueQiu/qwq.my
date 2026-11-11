import type { Expression } from "./store";

/** Cross-tree effects: the DOM (terminal, menus) pokes the 3D scene and vice versa. */
export type FxEvents = {
  flash: { duration?: number };
  glitch: { duration?: number; amount?: number };
  face: { expression: Expression; duration?: number };
  crash: Record<string, never>;
  reboot: Record<string, never>;
  game: { open: boolean };
  menu: { open: boolean };
  sceneReady: Record<string, never>;
  /** A bug was squashed at a screen position. */
  hit: { x: number; y: number; points: number; combo: number };
};

const PREFIX = "qwq:";

export function emit<K extends keyof FxEvents>(type: K, detail: FxEvents[K]) {
  window.dispatchEvent(new CustomEvent(PREFIX + type, { detail }));
}

export function on<K extends keyof FxEvents>(type: K, handler: (detail: FxEvents[K]) => void) {
  const listener = (e: Event) => handler((e as CustomEvent<FxEvents[K]>).detail);
  window.addEventListener(PREFIX + type, listener);
  return () => window.removeEventListener(PREFIX + type, listener);
}
