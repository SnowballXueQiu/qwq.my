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
  // Start sharp and back off on slow devices; the ink lines carry the look even at 1x.
  const [dpr, setDpr] = useState(1.5);
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
      <PerformanceMonitor
        onChange={({ factor }) => setDpr(Math.round((1 + factor * 0.75) * 4) / 4)}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />
      <Director />
      <InteractionBridge />
      <InkPipeline />
      <HeroStage />
      <PaperDoodles />
      <Toys />
      <DebrisField />
      <Atmosphere />
      <AboutStage />
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
