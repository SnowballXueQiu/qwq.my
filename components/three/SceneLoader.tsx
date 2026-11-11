"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/** Loads three.js only on the client and fades the canvas in once it has drawn. */
export function SceneLoader() {
  const [ready, setReady] = useState(false);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneCanvas onReady={() => requestAnimationFrame(() => setReady(true))} />
    </div>
  );
}
