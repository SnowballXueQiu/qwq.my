import { create } from "zustand";

export type Expression = "QwQ" | "OwO" | ">w<" | "QAQ" | "@w@" | "-w-" | "^w^";

type SiteState = {
  /** Index into `sheets` of the section currently in view. */
  sheet: number;
  /** Scroll progress of the whole page, 0–1. */
  progress: number;
  /** 0 = paper scene, 1 = dark scene. Drives both CSS and the shader inversion. */
  tone: number;
  expression: Expression;
  /** On a reading page (blog, project) rather than the home film. */
  reading: boolean;
  setReading: (reading: boolean) => void;
  setSheet: (sheet: number) => void;
  setProgress: (progress: number) => void;
  setTone: (tone: number) => void;
  setExpression: (expression: Expression) => void;
};

// High-frequency values (progress, tone) should be read with `useSite.getState()`
// inside animation frames rather than subscribed to from React.
export const useSite = create<SiteState>((set) => ({
  sheet: 0,
  progress: 0,
  tone: 0,
  expression: "QwQ",
  reading: false,
  setReading: (reading) => set({ reading }),
  setSheet: (sheet) => set({ sheet }),
  setProgress: (progress) => set({ progress }),
  setTone: (tone) => set({ tone }),
  setExpression: (expression) => set({ expression }),
}));

if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
  (window as unknown as { __qwqSite: typeof useSite }).__qwqSite = useSite;
}
