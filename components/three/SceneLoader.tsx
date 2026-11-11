"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { emit } from "@/lib/fx";
import type { SheetId } from "@/lib/sheets";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/** Loads three.js only on the client and fades the canvas in once it has drawn. */
export function SceneLoader({ titles }: { titles: Record<SheetId, string> }) {
  const [ready, setReady] = useState(false);
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneCanvas
        titles={titles}
        onReady={() =>
          requestAnimationFrame(() => {
            setReady(true);
            emit("sceneReady", {});
          })
        }
      />
    </div>
  );
}
