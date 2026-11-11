/** Mirrors the CSS custom properties in app/globals.css for use in shaders. */
export const palette = {
  paper: "#f1ede4",
  ink: "#141414",
  accent: "#e8402a",
} as const;

/** Hex → raw sRGB triple, for shaders that write straight to the canvas. */
export function srgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
