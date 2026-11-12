"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html, Line } from "@react-three/drei";
import { Vector3 } from "three";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import { emit, on } from "@/lib/fx";
import { scrollToSheet } from "@/components/scroll/beats";
import { sheetNumber, sheets } from "@/lib/sheets";
import { palette } from "@/lib/tokens";
import { sampleCamera } from "../Director";
import { OVERLAY_LAYER } from "../pipeline/InkPipeline";
import { useDomLayer } from "../dom/useDomLayer";

/**
 * The map shown when the camera pulls back: the whole flight path as a dashed
 * accent line, with a clickable tag at each sheet.
 */
export function OverviewMap({ titles }: { titles: Record<(typeof sheets)[number], string> }) {
  const [open, setOpen] = useState(false);
  useEffect(() => on("menu", ({ open }) => setOpen(open)), []);

  const { path, stops } = useMemo(() => {
    const p = new Vector3();
    const t = new Vector3();
    const path: [number, number, number][] = [];
    for (let s = 0; s <= 6.05; s += 0.01) {
      sampleCamera(s, p, t);
      path.push([p.x, p.y, p.z]);
    }
    const stops = sheets.map((id, i) => {
      sampleCamera(i + (i === 0 ? 0.2 : 0.5), p, t);
      return { id, pos: [p.x, p.y + 7, p.z] as [number, number, number] };
    });
    return { path, stops };
  }, []);

  const line = useRef<Line2>(null);
  useEffect(() => {
    line.current?.layers.set(OVERLAY_LAYER);
  }, [open]);

  // Labels live in a fixed layer; drei would otherwise position them against the
  // scrolled document and they'd land off-screen.
  const portal = useDomLayer(65);

  if (!open) return null;
  return (
    <group>
      <Line ref={line} points={path} color={palette.accent} lineWidth={2} dashed dashSize={3} gapSize={2} />
      {stops.map(({ id, pos }) => (
        <Html key={id} position={pos} center portal={portal} zIndexRange={[70, 60]} style={{ pointerEvents: "auto" }}>
          <button
            type="button"
            data-cursor="FLY"
            onClick={() => {
              emit("menu", { open: false });
              setTimeout(() => scrollToSheet(id), 60);
            }}
            className="group flex items-center gap-2 whitespace-nowrap border border-[#f1ede4] bg-[#141414] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[#f1ede4] transition-colors hover:bg-[#e8402a]"
          >
            <span className="text-[#e8402a] group-hover:text-[#141414]">{sheetNumber(id)}</span>
            {titles[id]}
          </button>
        </Html>
      ))}
    </group>
  );
}
