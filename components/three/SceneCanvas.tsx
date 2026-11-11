"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useRef } from "react";
import { InkPipeline } from "./pipeline/InkPipeline";
import { Mascot, type MascotHandle } from "./mascot/Mascot";

function HeroStage() {
  const viewport = useThree((s) => s.viewport);
  const handle = useRef<MascotHandle | null>(null);
  const portrait = viewport.aspect < 1;
  const scale = portrait ? viewport.width / 8.2 : Math.min(viewport.height / 8.6, viewport.width / 16.5);
  return (
    <group
      position={portrait ? [0, viewport.height * 0.16, 0] : [viewport.width * 0.2, viewport.height * 0.08, 0]}
      scale={scale}
    >
      <Mascot handle={handle} />
    </group>
  );
}

export default function SceneCanvas({ onReady }: { onReady?: () => void }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      flat
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ fov: 35, position: [0, 0, 14], near: 0.1, far: 200 }}
      eventSource={document.body}
      eventPrefix="client"
      onCreated={() => onReady?.()}
      style={{ position: "fixed", inset: 0, zIndex: 0 }}
    >
      <InkPipeline />
      <HeroStage />
    </Canvas>
  );
}
