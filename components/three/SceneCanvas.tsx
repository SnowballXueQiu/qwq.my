"use client";

import { Canvas } from "@react-three/fiber";
import { Director } from "./Director";
import { InkPipeline } from "./pipeline/InkPipeline";
import { DebrisField } from "./stages/DebrisField";
import { HeroStage } from "./stages/HeroStage";

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
    </Canvas>
  );
}
