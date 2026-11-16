import { ViewTransition } from "react";

/**
 * Moving to another page swaps the sheet on the board: the old one lifts away and the
 * next is drawn on from the top (see "Page changes" in globals.css). The 3D scene and the
 * frame stay put. Jumps within a page keep their own speed-line effect instead.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="sheet-in" exit="sheet-out" default="none">
      {children}
    </ViewTransition>
  );
}
