"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { Locale } from "@/lib/i18n";
import type { SheetId } from "@/lib/sheets";
import { Director } from "./Director";
import { BugGame } from "./game/BugGame";
import { InteractionBridge } from "./interact/InteractionBridge";
import { PaperDoodles } from "./interact/PaperDoodles";
import { Toys } from "./toys/Toys";
import { InkPipeline } from "./pipeline/InkPipeline";
import { DebrisField } from "./stages/DebrisField";
import { AboutStage } from "./stages/AboutStage";
import { Atmosphere } from "./stages/Atmosphere";
import { FinaleStage } from "./stages/FinaleStage";
import { HeroStage } from "./stages/HeroStage";
import { OverviewMap } from "./stages/OverviewMap";
import { ProjectsStage } from "./stages/ProjectsStage";
import { SkillsStage } from "./stages/SkillsStage";
import { TimelineStage } from "./stages/TimelineStage";
import { WritingStage } from "./stages/WritingStage";

export default function SceneCanvas({
  onReady,
  titles,
  postCount,
  github,
  locale,
}: {
  onReady?: () => void;
  titles: Record<SheetId, string>;
  postCount: number;
  github: { total: number; weeks: { date: string; count: number }[][] };
  locale: Locale;
}) {
  // As sharp as the screen allows within a pixel budget: a phone gets 2x (its screen is small,
  // and at 1x–1.5x a 3x display turns the type to mush); a big monitor less. Slow devices
  // step down once, by a quarter.
  const [sharpest] = useState(() => Math.max(1, Math.min(devicePixelRatio, 2, Math.sqrt(3.2e6 / (innerWidth * innerHeight)))));
  const [declined, setDeclined] = useState(false);
  const dpr = declined ? Math.max(1, sharpest * 0.75) : sharpest;
  return (
    <Canvas
      dpr={dpr}
      flat
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 35, position: [0, 0, 14], near: 0.1, far: 220 }}
      eventSource={document.body}
      eventPrefix="client"
      onCreated={() => onReady?.()}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      {/* Only ever steps down, once, so the canvas isn't reallocated mid-scroll. */}
      <PerformanceMonitor onDecline={() => setDeclined(true)} />
      <Director />
      <InteractionBridge />
      <InkPipeline />
      <HeroStage />
      <PaperDoodles />
      <Toys />
      <DebrisField />
      <Atmosphere />
      <AboutStage locale={locale} />
      <SkillsStage />
      <ProjectsStage />
      <TimelineStage github={github} locale={locale} />
      <WritingStage postCount={postCount} />
      <FinaleStage />
      <OverviewMap titles={titles} />
      <BugGame />
    </Canvas>
  );
}
