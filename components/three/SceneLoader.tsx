"use client";

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { QwQLogo } from "@/components/ui/QwQLogo";
import { emit } from "@/lib/fx";
import type { SheetId } from "@/lib/sheets";

const SceneCanvas = dynamic(() => import("./SceneCanvas"), { ssr: false });

/** Loads three.js only on the client and fades the canvas in once it has drawn. */
function hasWebGL2() {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

const noop = () => () => {};

export function SceneLoader({ titles, postCount }: { titles: Record<SheetId, string>; postCount: number }) {
  const [ready, setReady] = useState(false);
  // null on the server, then whether this browser can run the scene at all.
  const webgl = useSyncExternalStore(noop, hasWebGL2, () => null);

  if (webgl === false) {
    // Without WebGL the page stays a paper drawing; QwQ is still here, as ink.
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-start justify-end p-[12vh_8vw]">
        <QwQLogo className="w-[min(46vw,560px)] text-ink" />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <SceneCanvas
        titles={titles}
        postCount={postCount}
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
