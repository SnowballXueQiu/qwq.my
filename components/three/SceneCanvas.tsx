"use client";

import { Canvas } from "@react-three/fiber";
import { Director } from "./Director";
import { InkPipeline } from "./pipeline/InkPipeline";
import { DebrisField } from "./stages/DebrisField";
import { AboutStage } from "./stages/AboutStage";
import { HeroStage } from "./stages/HeroStage";
import { ProjectsStage } from "./stages/ProjectsStage";
import { SkillsStage } from "./stages/SkillsStage";
import { TimelineStage } from "./stages/TimelineStage";

export default function SceneCanvas({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      flat
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 35, position: [0, 0, 14], near: 0.1, far: 220 }}
      eventSource={document.body}
      eventPrefix="client"
      onCreated={() => onReady?.()}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      <Director />
      <InkPipeline />
      <HeroStage />
      <DebrisField />
      <AboutStage />
      <SkillsStage />
      <ProjectsStage />
      <TimelineStage />
    </Canvas>
  );
}
