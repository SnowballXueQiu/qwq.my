export type Theme = "paper" | "blueprint";

/** Mirrors the CSS custom properties in app/globals.css for use in shaders. */
export const palette: Record<Theme, { paper: string; ink: string; accent: string }> = {
  paper: { paper: "#f1ede4", ink: "#141414", accent: "#e8402a" },
  blueprint: { paper: "#0e2a47", ink: "#e6eff8", accent: "#ff6a4d" },
};

export const THEME_STORAGE_KEY = "qwq-theme";
