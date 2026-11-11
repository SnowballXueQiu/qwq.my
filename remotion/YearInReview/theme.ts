import { continueRender, delayRender, staticFile } from "remotion";
import { palette } from "@/lib/tokens";

export const C = { paper: palette.paper, ink: palette.ink, accent: palette.accent };

export const FONT = {
  display: "'QwQ Display', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  mono: "'QwQ Mono', 'PingFang SC', monospace",
};

let loaded = false;

/** Loads the video's two faces once; rendering waits for them. */
export function loadVideoFonts() {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender("Loading fonts");
  const faces = [
    new FontFace("QwQ Display", `url(${staticFile("/fonts/ArchivoCondensed-Black.ttf")})`),
    new FontFace("QwQ Mono", `url(${staticFile("/fonts/JetBrainsMono-Bold.ttf")})`),
  ];
  Promise.all(faces.map((f) => f.load()))
    .then((ready) => ready.forEach((f) => document.fonts.add(f)))
    .catch(() => {})
    .finally(() => continueRender(handle));
}

/** Screen-space halftone, as a CSS background, matching the site's shading. */
export const halftone = (color: string, size = 8, dot = 1.6) => ({
  backgroundImage: `radial-gradient(${color} ${dot}px, transparent ${dot + 0.5}px)`,
  backgroundSize: `${size}px ${size}px`,
});
