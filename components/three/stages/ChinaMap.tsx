"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { CylinderGeometry, ExtrudeGeometry, Group, Path, Shape, SphereGeometry, type ShaderMaterial } from "three";
import { PROVINCE_COUNT, places, visitedProvinces } from "@/content/places";
import type { Locale } from "@/lib/i18n";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { clamp01, frameState, withOverview } from "../frameState";
import { useDomLayer } from "../dom/useDomLayer";
import { MAP_S } from "../world";

type Ring = [number, number][];
type Province = { a: string; n: string; p: Ring[][] };

/** World units per degree of latitude, and the map's centre. */
const SCALE = 0.36;
const LON0 = 104.2;
const LAT0 = 28.5;
const KX = Math.cos((36 * Math.PI) / 180);

/** Longitude/latitude to map-plane coordinates (x east, y north). */
export const project = (lon: number, lat: number): [number, number] => [(lon - LON0) * KX * SCALE, (lat - LAT0) * SCALE];

const BASE_H = 0.22;
const VISITED_H = 0.75;

function useProvinces() {
  const [data, setData] = useState<Province[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/geo/china.json")
      .then((r) => r.json())
      .then((j: { provinces: Province[] }) => alive && setData(j.provinces))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

function shapesFor(polys: Ring[][]) {
  return polys.map((rings) => {
    const shape = new Shape(rings[0].map(([lon, lat]) => {
      const [x, y] = project(lon, lat);
      return { x, y } as never;
    }));
    for (const hole of rings.slice(1)) {
      shape.holes.push(new Path(hole.map(([lon, lat]) => {
        const [x, y] = project(lon, lat);
        return { x, y } as never;
      })));
    }
    return shape;
  });
}

/**
 * "Places I've been": China as an extruded ink map. Visited provinces stand
 * taller in red; every place gets a pin with a leader line and a crisp DOM
 * label.
 */
export function ChinaMap({ locale, ...group }: { locale: Locale } & React.ComponentProps<"group">) {
  const provinces = useProvinces();
  const layer = useDomLayer(14);
  const root = useRef<Group>(null);
  const tiles = useRef<(Group | null)[]>([]);
  const portrait = useThree((s) => s.size.width < s.size.height);

  // One material per province so the ink pass draws every border.
  const built = useMemo(() => {
    if (!provinces) return null;
    return provinces.map((pv, i) => {
      const dash = pv.a.endsWith("_JD");
      const visited = visitedProvinces.has(pv.a);
      const h = dash ? 0.12 : visited ? VISITED_H : BASE_H;
      const geometry = new ExtrudeGeometry(shapesFor(pv.p), { depth: h, bevelEnabled: false, curveSegments: 1 });
      const material: ShaderMaterial = dash
        ? createInkMaterial({ fill: Fill.ink })
        : createInkMaterial({ accent: visited ? 1 : 0, toneBias: visited ? 0.05 : 0.18 });
      return { key: pv.a, geometry, material, visited, h, delay: (i % 12) / 12 };
    });
  }, [provinces]);
  useEffect(
    () => () => {
      built?.forEach((b) => {
        b.geometry.dispose();
        b.material.dispose();
      });
    },
    [built],
  );

  const pin = useMemo(
    () => ({
      stem: new CylinderGeometry(0.03, 0.03, 1, 8),
      head: new SphereGeometry(0.16, 16, 12),
      ink: createInkMaterial({ fill: Fill.ink }),
      paper: createInkMaterial({ fill: Fill.paper }),
    }),
    [],
  );
  useEffect(() => () => Object.values(pin).forEach((x) => x.dispose()), [pin]);

  // In over the about sheet's map beat, out on the way to skills.
  const cue = () => {
    const s = frameState.s;
    if (s < MAP_S.arrive || s > MAP_S.leave + 0.08) return -1;
    if (s < MAP_S.hold) return (s - MAP_S.arrive) / (MAP_S.hold - MAP_S.arrive);
    if (s < MAP_S.leave) return 1;
    return 1 + (s - MAP_S.leave) / 0.08;
  };

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const p = withOverview(cue());
    g.visible = p > 0 && p < 2;
    // Provinces rise out of the table one after another.
    built?.forEach((b, i) => {
      const t = tiles.current[i];
      if (!t) return;
      const rise = clamp01((Math.min(p, 1) - b.delay * 0.5) / 0.5);
      t.scale.set(1, 1, Math.max(rise * rise * (3 - 2 * rise), 0.001));
    });
    const o = p <= 0 || p >= 2 ? 0 : p < 1 ? clamp01((p - 0.6) / 0.4) : 2 - p;
    const title = layer.current?.querySelector<HTMLElement>("[data-map-title]");
    if (title) {
      const s = frameState.s;
      const t = s < MAP_S.leave ? clamp01((s - (MAP_S.hold + 0.08)) / 0.05) : o;
      title.style.opacity = t.toFixed(3);
      title.style.visibility = t > 0.01 && frameState.overview < 0.3 ? "visible" : "hidden";
    }
    // Labels live in this map's own DOM layer; fade them with the map.
    for (const el of layer.current?.querySelectorAll<HTMLElement>("[data-map-label]") ?? []) {
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o > 0.01 && frameState.overview < 0.3 ? "visible" : "hidden";
    }
  });

  const labelSize = portrait ? "text-[10px] px-1 py-0" : "text-[14px]";

  return (
    <group ref={root} {...group}>
      {/* The map lies flat: shape x → east, shape y → north (away from the camera), extrusion → up. */}
      <group rotation={[-Math.PI / 2, 0, 0]}>
        {built?.map((b, i) => (
          <group
            key={b.key}
            ref={(g) => {
              tiles.current[i] = g;
            }}
          >
            <mesh geometry={b.geometry} material={b.material} />
          </group>
        ))}
      </group>

      {places.map((pl) => {
        const [x, y] = project(pl.lon, pl.lat);
        // Every place sits in a visited (raised) province.
        const top = VISITED_H;
        const stem = 1.1;
        const [lx, ly] = project(pl.lon + pl.label[0], pl.lat + pl.label[1]);
        return (
          <group key={pl.name.en} position={[x, top, -y]}>
            <mesh geometry={pin.stem} material={pin.ink} position={[0, stem / 2, 0]} scale={[1, stem, 1]} />
            <mesh geometry={pin.head} material={pin.paper} position={[0, stem, 0]} />
            <Html position={[lx - x, stem, -(ly - y)]} center portal={layer} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
              <div
                data-map-label
                className={`whitespace-nowrap border border-ink bg-paper/90 px-1.5 py-0.5 font-mono font-bold text-ink ${labelSize}`}
                style={{ opacity: 0 }}
              >
                {pl.name[locale]}
              </div>
            </Html>
            {/* Leader from the pin head to its label. */}
            <LeaderLine from={[0, stem, 0]} to={[lx - x, stem, -(ly - y)]} geometry={pin.stem} material={pin.ink} />
          </group>
        );
      })}


      {/* Title south-west of Tibet; it waits until the about panel has scrolled away. */}
      <Html
        position={portrait ? [project(80, 11)[0], 0.3, -project(80, 11)[1]] : [project(74, 25)[0], 0.3, -project(74, 25)[1]]}
        portal={layer}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div data-map-title className="whitespace-nowrap text-ink" style={{ opacity: 0 }}>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">REF 02-B · FOOTPRINTS</p>
          <p className={`font-display font-black leading-none ${portrait ? "text-[22px]" : "text-[34px]"}`}>
            {locale === "zh" ? "去过的地方" : "Places I've been"}
          </p>
          <p className="mt-1 font-mono text-[12px] text-ink-soft">
            {locale === "zh"
              ? `${places.length} 个地方 · ${visitedProvinces.size} / ${PROVINCE_COUNT} 个省级行政区`
              : `${places.length} places · ${visitedProvinces.size} / ${PROVINCE_COUNT} provinces`}
          </p>
          <p className={`mt-2 border-l-2 border-accent pl-2 ${portrait ? "text-[12px]" : "text-[15px]"}`}>
            {locale === "zh" ? "我的梦想是走遍中国的每一个省份。" : "My dream is to set foot in every province of China."}
          </p>
          {/* Progress toward that dream: one tick per province. */}
          <div className="mt-2 flex gap-[3px]" aria-hidden>
            {Array.from({ length: PROVINCE_COUNT }, (_, i) => (
              <span key={i} className={`h-2 w-[5px] ${i < visitedProvinces.size ? "bg-accent" : "border border-ink/40"}`} />
            ))}
          </div>
        </div>
      </Html>
    </group>
  );
}

/** A thin ink rod between two points (in the parent's space). */
function LeaderLine({
  from,
  to,
  geometry,
  material,
}: {
  from: [number, number, number];
  to: [number, number, number];
  geometry: CylinderGeometry;
  material: ShaderMaterial;
}) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dz);
  // The cylinder runs along y; lay it flat and point it from → to.
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[(from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2]}
      rotation={[0, Math.atan2(dz, -dx), Math.PI / 2]}
      scale={[0.6, len, 0.6]}
    />
  );
}
