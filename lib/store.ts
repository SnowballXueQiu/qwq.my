import { create } from "zustand";
import type { Theme } from "./tokens";

type SiteState = {
  /** Index into `sheets` of the section currently in view. */
  sheet: number;
  /** Scroll progress of the whole page, 0–1. */
  progress: number;
  theme: Theme;
  setSheet: (sheet: number) => void;
  setProgress: (progress: number) => void;
  setTheme: (theme: Theme) => void;
};

// High-frequency values (progress) should be read with `useSite.getState()`
// inside animation frames rather than subscribed to from React.
export const useSite = create<SiteState>((set) => ({
  sheet: 0,
  progress: 0,
  theme: "paper",
  setSheet: (sheet) => set({ sheet }),
  setProgress: (progress) => set({ progress }),
  setTheme: (theme) => set({ theme }),
}));
