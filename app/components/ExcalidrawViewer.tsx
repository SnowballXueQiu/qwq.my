"use client";

import { PointerEvent, useMemo, useRef, useState } from "react";

type ElementShape = {
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
};

export function ExcalidrawViewer({ source }: { source: string }) {
  const elements = useMemo(() => parseElements(source), [source]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  function start(event: PointerEvent<HTMLDivElement>) {
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const next = { x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y };
    setPan(next);
  }

  function stop() {
    drag.current = null;
    setIsDragging(false);
  }

  function reset() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  return (
    <div className="excalidraw-viewer">
      <div className="excalidraw-toolbar" role="group" aria-label="Excalidraw controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value - 0.15))} aria-label="Zoom out">
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(2.5, value + 0.15))} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="excalidraw-center-button" onPointerDown={(event) => event.stopPropagation()} onClick={reset}>
          Center
        </button>
      </div>
      <div
        className={isDragging ? "excalidraw-canvas dragging" : "excalidraw-canvas"}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <svg
          viewBox="0 0 900 420"
          role="img"
          aria-label="Excalidraw preview"
          style={{ transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})` }}
        >
          {elements.map((element, index) => {
            if (element.type === "ellipse") return <ellipse cx={element.x + element.width / 2} cy={element.y + element.height / 2} rx={element.width / 2} ry={element.height / 2} key={index} />;
            if (element.type === "text") return <text x={element.x} y={element.y + 22} key={index}>{element.text}</text>;
            return <rect x={element.x} y={element.y} width={element.width} height={element.height} rx={18} key={index} />;
          })}
        </svg>
      </div>
    </div>
  );
}

function parseElements(source: string): ElementShape[] {
  try {
    const parsed = JSON.parse(source) as { elements?: Array<{ type?: string; x?: number; y?: number; width?: number; height?: number; text?: string }> };
    const elements = parsed.elements ?? [];
    if (!elements.length) return [];
    const minX = Math.min(...elements.map((element) => element.x ?? 0));
    const minY = Math.min(...elements.map((element) => element.y ?? 0));
    const maxX = Math.max(...elements.map((element) => (element.x ?? 0) + (element.width ?? 120)));
    const maxY = Math.max(...elements.map((element) => (element.y ?? 0) + (element.height ?? 80)));
    const offsetX = 450 - (maxX - minX) / 2;
    const offsetY = 210 - (maxY - minY) / 2;
    return elements.map((element) => ({
      type: element.type ?? "rectangle",
      x: (element.x ?? 0) - minX + offsetX,
      y: (element.y ?? 0) - minY + offsetY,
      width: element.width ?? 120,
      height: element.height ?? 80,
      text: element.text,
    }));
  } catch {
    return [];
  }
}
