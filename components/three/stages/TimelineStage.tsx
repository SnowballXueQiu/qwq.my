"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BoxGeometry, BufferAttribute, BufferGeometry, DoubleSide, Group, InstancedMesh, Object3D } from "three";
import { Html } from "@react-three/drei";
import { KIND_LABEL, timeline, whenLabel, type TimelineEvent, type TimelineMedia } from "@/content/timeline";
import type { Locale } from "@/lib/i18n";
import { showLightbox } from "@/components/ui/Lightbox";
import { useDomLayer } from "../dom/useDomLayer";
import { MilestoneMarker, useMarkerKit, type MarkerKit } from "./MilestoneMarkers";
import { PelicanRider } from "./PelicanRider";
import { createInkMaterial, Fill } from "../materials/inkMaterial";
import { clamp01, frameState, withOverview } from "../frameState";
import { PLAZA_S, WORLD, milestoneZ, roadX } from "../world";

const ROAD_Y = -1.1;
const ROAD_W = 3.2;

/** A flat ribbon following roadX(z), with a lateral coordinate for printing lane marks. */
function buildRoad(from: number, to: number, samples = 240) {
  const pos: number[] = [];
  const lat: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const z = from + (to - from) * (i / samples);
    const x = roadX(z);
    const dx = roadX(z - 0.5) - x;
    const len = Math.hypot(dx, 0.5);
    // Perpendicular to the travel direction (dx, -0.5) in the xz-plane.
    const lx = 0.5 / len;
    const lz = dx / len;
    for (const side of [-1, 1]) {
      pos.push(x + lx * side * (ROAD_W / 2), ROAD_Y, z + lz * side * (ROAD_W / 2));
      lat.push(side);
    }
    if (i < samples) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute("aLat", new BufferAttribute(new Float32Array(lat), 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Edge lines, a dashed centre line and ruler ticks every few units: a road drawn like a scale bar.
const roadVertexHead = /* glsl */ `
in float aLat;
out float vLat;
`;
const roadTransform = /* glsl */ `
  vLat = aLat;
`;
const roadFragmentHead = /* glsl */ `
in float vLat;
`;
const roadPrint = /* glsl */ `
  float a = abs(vLat);
  float edge = smoothstep(0.86, 0.9, a) * (1.0 - smoothstep(0.96, 1.0, a));
  float dash = step(0.45, fract(vRest.z * 0.22)) * (1.0 - smoothstep(0.025, 0.05, a));
  float dTick = abs(fract(vRest.z * 0.5 + 0.5) - 0.5) * 2.0;
  float tick = (1.0 - smoothstep(0.03, 0.06, dTick)) * smoothstep(0.62, 0.66, a);
  float dMajor = abs(fract(vRest.z / 12.0 + 0.5) - 0.5) * 12.0;
  float major = 1.0 - smoothstep(0.05, 0.1, dMajor);
  printed = max(max(edge, dash), max(tick * 0.8, major * 0.7));
`;

const DF = 4; // drei Html distanceFactor: 1 CSS px = DF / 400 world units
/**
 * CSS-3D text is laid out this many times larger and shrunk back by the
 * transform. WebKit rasterizes a transformed layer at its layout size, so text
 * laid out small and scaled up by the transform goes soft on phones.
 */
const CRISP = 2;
/**
 * drei stacks Html by camera distance mapped onto this range (over the whole
 * near→far span). A wide range keeps nearer signs/exhibits above farther ones;
 * a narrow one rounds neighbours to the same z-index and DOM order wins.
 */
const Z_RANGE = [1_000_000, 0];

type GithubScene = { total: number; weeks: { date: string; count: number }[][] };

/** Fades a DOM node by a 0–1(–2) cue without re-rendering React. */
function useCueFade(cue: () => number) {
  const el = useRef<HTMLDivElement>(null);
  useFrame(() => {
    const node = el.current;
    if (!node) return;
    const p = frameState.overview > 0.3 || frameState.game > 0.5 ? -1 : cue();
    const o = p <= 0 || p >= 2 ? 0 : p < 1 ? p : 2 - p;
    node.style.opacity = o.toFixed(3);
    node.style.visibility = o > 0.01 ? "visible" : "hidden";
    node.style.transform = `translateY(${((1 - Math.min(o * 1.4, 1)) * 24).toFixed(1)}px)`;
  });
  return el;
}

function Milestone({ index, kit, locale, layer }: { index: number; kit: MarkerKit; locale: Locale; layer: React.RefObject<HTMLElement> }) {
  const event = timeline[index];
  const z = milestoneZ(index, timeline.length);
  const side = index % 2 === 0 ? -1 : 1;
  const x = roadX(z) + side * (ROAD_W / 2 + 1.4);
  const root = useRef<Group>(null);
  const aspect = useThree((st) => st.size.width / st.size.height);
  // Phones: the verges are out of frame, so the sign and the exhibit move to the
  // middle of the road, smaller, and only the stop you're at shows its sign.
  const portrait = aspect < 1;

  // Arrive as the camera approaches; gone once it has driven past.
  const near = () => {
    const s = frameState.s;
    if (s < 3.85 || s > 5.3) return -1;
    const camZ = frameState.cameraZ;
    const arrive = clamp01((z + 36 - camZ) / 12);
    // Gone before the camera reaches the next stop (stops are ~10 apart, it halts ~14 short).
    const leave = clamp01((z + 12 - camZ) / 3);
    return leave > 0 ? 1 + leave : arrive;
  };
  // The sign and exhibit only belong to the stop you're at.
  const here = () => {
    const s = frameState.s;
    if (s < 3.85 || s > 5.3) return -1;
    const d = frameState.cameraZ - z;
    if (d > 26 || d < 7) return -1;
    return d > 17 ? (26 - d) / 9 : d > 10 ? 1 : 1 + (10 - d) / 3;
  };
  const sign = useCueFade(() => (portrait ? here() : near()));
  const exhibit = useCueFade(here);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const p = withOverview(near());
    g.visible = p > 0 && p < 2;
    g.scale.setScalar(Math.max(0.001, Math.min(p, 1)));
  });

  const media = event.media;
  return (
    <group position={[x, ROAD_Y, z]}>
      <group ref={root}>
        <mesh geometry={kit.geo.base} material={kit.mat.ink} position={[0, 1.2, 0]} scale={[0.2, 17, 0.2]} />
        <group position={[0, 2.75, 0]} scale={1.2}>
          <MilestoneMarker kind={event.kind} kit={kit} seed={index} />
        </group>
      </group>

      {/* Roadside sign above the post, turned a little toward the road; high in
          the frame so the index panel never covers it. */}
      <Html
        transform
        distanceFactor={(portrait ? DF * 0.7 : DF) / CRISP}
        portal={layer}
        position={portrait ? [roadX(z) - x, 4.9, -2] : [side * 0.2, 4.6, 0]}
        rotation={[0, portrait ? 0 : -side * 0.28, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={Z_RANGE}
      >
        <div ref={sign} className="w-[300px] border-2 border-ink bg-paper/90 p-3.5 text-ink" style={{ opacity: 0, zoom: CRISP }}>
          <div className="flex items-baseline justify-between gap-3 border-b border-ink pb-1.5">
            <span className="font-mono text-[22px] font-bold text-accent">{whenLabel(event, locale)}</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
              {String(index + 1).padStart(2, "0")} · {KIND_LABEL[event.kind][locale]}
            </span>
          </div>
          {event.logo && (
            <div className={`mt-2.5 inline-block ${event.logo.dark ? "bg-[#141414] px-2.5 py-1.5" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- drawn inside a CSS 3D transform */}
              <img
                src={event.logo.src}
                alt={event.logo.alt[locale]}
                className={`block w-auto ${event.logo.dark ? "h-[38px]" : "h-[52px]"}`}
                draggable={false}
              />
            </div>
          )}
          <p className="mt-2 text-[20px] font-extrabold leading-tight">{event.title[locale]}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{event.detail[locale]}</p>
          {event.code && <EditorSnippet code={event.code} />}
        </div>
      </Html>

      {/* The evidence, centred over the road while you're at this stop. */}
      {media && (
        <Html
          transform
          distanceFactor={(portrait ? DF * 0.55 : DF) / CRISP}
          portal={layer}
          position={portrait ? [roadX(z - 3) - x, 1.7, -3] : [roadX(z - 3) - x - side * 1.6, 2.7, -3]}
          style={{ pointerEvents: "none" }}
          zIndexRange={Z_RANGE}
        >
          <div ref={exhibit} className="pointer-events-auto" style={{ opacity: 0, zoom: CRISP }}>
            <Exhibit media={media} locale={locale} />
          </div>
        </Html>
      )}
    </group>
  );
}

const KEYWORDS = new Set(["int", "void", "char", "auto", "const", "return", "using", "namespace"]);

/** A few lines of C-family code dressed as an editor tab: line numbers, a little highlighting, squiggles under typos. */
function EditorSnippet({ code }: { code: NonNullable<TimelineEvent["code"]> }) {
  const typos = new Set(code.typos);
  const line = (text: string) =>
    text.split(/(#\w+|"[^"]*"|\b\w+\b)/).map((tok, i) => {
      if (!tok) return null;
      if (tok.startsWith("#")) return <span key={i} className="text-accent">{tok}</span>;
      if (tok.startsWith('"')) return <span key={i} className="text-ink-soft">{tok}</span>;
      if (KEYWORDS.has(tok)) return <span key={i} className="font-bold text-accent">{tok}</span>;
      if (typos.has(tok)) {
        return (
          <span key={i} className="underline decoration-accent decoration-wavy decoration-[1.5px] underline-offset-[3px]">
            {tok}
          </span>
        );
      }
      return tok;
    });
  return (
    <div className="mt-3 border border-ink font-mono text-[12px]">
      <div className="flex items-center gap-1.5 border-b border-ink px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-ink-soft">
        <span className="size-[7px] rounded-full bg-accent" />
        <span className="size-[7px] rounded-full border border-ink" />
        <span className="size-[7px] rounded-full border border-ink" />
        <span className="ml-1.5 normal-case tracking-normal text-ink">{code.file}</span>
        <span className="ml-auto">{code.lang}</span>
      </div>
      <pre className="py-1.5 leading-[1.55]">
        {code.source.split("\n").map((text, i) => (
          <div key={i} className="flex">
            <span className="w-7 shrink-0 select-none pr-2 text-right text-ink-soft/60">{i + 1}</span>
            <code>{line(text)}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}

function Exhibit({ media, locale }: { media: TimelineMedia; locale: Locale }) {
  if (media.type === "certificates") {
    const shots = media.images.map((im) => ({ src: im.src[locale], alt: im.alt[locale] }));
    return (
      <div className="flex gap-5">
        {shots.map((shot, i) => (
          <button
            key={shot.src}
            type="button"
            data-cursor="ZOOM"
            onClick={() => showLightbox(shots, i)}
            className="w-[220px] border-2 border-ink bg-paper p-1.5 shadow-[10px_10px_0_var(--accent)] transition-transform hover:-translate-y-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- drawn inside a CSS 3D transform */}
            <img src={shot.src} alt={shot.alt} className="block h-auto w-full" draggable={false} />
          </button>
        ))}
      </div>
    );
  }
  const shot = { src: media.src, alt: media.alt[locale] };
  return (
    <div className="flex items-end gap-6">
      <button type="button" data-cursor="ZOOM" onClick={() => showLightbox([shot])} className="w-[420px] transition-transform hover:-translate-y-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn inside a CSS 3D transform */}
        <img src={media.src} alt={shot.alt} className="block h-auto w-full drop-shadow-[0_12px_0_rgba(232,64,42,0.6)]" draggable={false} />
      </button>
      <dl className="mb-4 w-[150px] space-y-2 border-l-2 border-accent bg-paper/85 py-2 pl-3 text-ink">
        {media.stats.map((st) => (
          <div key={st.value + st.label.en}>
            <dt className="font-display text-[38px] font-black leading-none text-accent">{st.value}</dt>
            <dd className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-soft">{st.label[locale]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const CELL = 1;
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Towers print their own windows: floors every 0.6 units, three bays per face,
// on every side face; roofs stay plain. In the dark world the facade is ink
// and the windows are lit.
const towerVertexHead = /* glsl */ `
out vec3 vWin;
`;
const towerTransform = /* glsl */ `
  #ifdef USE_INSTANCING
    vWin = (instanceMatrix * vec4(position, 1.0)).xyz;
  #else
    vWin = position;
  #endif
`;
const towerFragmentHead = /* glsl */ `
in vec3 vWin;
`;
const towerPrint = /* glsl */ `
  bool roof = vRest.y > 0.499;
  bool sideX = abs(vRest.x) > 0.499;
  float along = sideX ? vWin.z : vWin.x;
  float floorBand = step(0.3, fract(vWin.y / 0.6)) * step(fract(vWin.y / 0.6), 0.75);
  float bay = step(0.22, fract(along * 3.0 / ${CELL.toFixed(1)})) * step(fract(along * 3.0 / ${CELL.toFixed(1)}), 0.72);
  float lit = step(0.35, hash12(floor(vec2(along * 3.0, vWin.y / 0.6)) + 7.0));
  float windows = roof || vRest.y < -0.499 || vWin.y < -0.7 ? 0.0 : floorBand * bay * mix(0.35, 1.0, lit);
  float shade = 1.0 - clamp(dot(n, uLightDir) * 0.5 + 0.5, 0.0, 1.0);
  printed = max(windows * 0.9, shade * 0.35 + (roof ? 0.12 : 0.0));
`;

/**
 * Where the road ends: the last year of GitHub contributions as a city. One
 * tower per day, laid out like the profile graph (weeks left→right, Sunday at
 * the back), height by contributions, the busiest days in red. You see the
 * skyline from the last milestone, drive in among the towers, then crane up
 * until it reads as the familiar grid. Hover a tower for its day.
 */
function ContributionPlaza({ github, locale, layer }: { github: GithubScene; locale: Locale; layer: React.RefObject<HTMLElement> }) {
  const portrait = useThree((st) => st.size.width < st.size.height);
  const z0 = WORLD.timeline.plazaZ;
  const x0 = roadX(z0);
  const root = useRef<Group>(null);
  const cols = github.weeks.length;

  const { bars, months } = useMemo(() => {
    const flat = github.weeks.flat().map((d) => d.count);
    const hot = [...flat].sort((a, b) => b - a)[Math.min(9, flat.length - 1)] || 1;
    const out: { x: number; z: number; h: number; hot: boolean; col: number; date: string; count: number }[] = [];
    const labels: { x: number; text: string }[] = [];
    let lastMonth = -1;
    github.weeks.forEach((week, w) => {
      const x = x0 + (w - (cols - 1) / 2) * CELL;
      const month = Number(week[0]?.date.slice(5, 7)) - 1;
      if (month !== lastMonth && week[0] && Number(week[0].date.slice(8, 10)) <= 7) {
        labels.push({ x, text: MONTHS[month] });
        lastMonth = month;
      }
      week.forEach((day) => {
        const d = new Date(`${day.date}T00:00:00Z`).getUTCDay();
        out.push({
          x,
          z: z0 + (d - 3) * CELL,
          // Skyscrapers: a busy day is a tower; an empty day is a paved lot.
          h: day.count ? 1.4 + Math.sqrt(day.count) * 2.2 : 0.12,
          hot: day.count > 0 && day.count >= hot,
          col: w,
          date: day.date,
          count: day.count,
        });
      });
    });
    return { bars: out, months: labels };
  }, [github.weeks, x0, z0, cols]);

  const groups = useMemo(() => ({ body: bars.filter((b) => !b.hot), hot: bars.filter((b) => b.hot) }), [bars]);
  const geometry = useMemo(() => new BoxGeometry(CELL * 0.8, 1, CELL * 0.8), []);
  const slab = useMemo(() => new BoxGeometry(cols * CELL + 2, 0.12, 7 * CELL + 2), [cols]);
  const mats = useMemo(
    () => ({
      body: createInkMaterial({
        fill: Fill.paper,
        vertexHead: towerVertexHead,
        vertexTransform: towerTransform,
        fragmentHead: towerFragmentHead,
        fragmentPrint: towerPrint,
      }),
      hot: createInkMaterial({ accent: 1 }),
      slab: createInkMaterial({ fill: Fill.sheet }),
    }),
    [],
  );
  useEffect(() => () => [geometry, slab].forEach((g) => g.dispose()), [geometry, slab]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const meshes = useRef<{ body: InstancedMesh | null; hot: InstancedMesh | null }>({ body: null, hot: null });
  const dummy = useMemo(() => new Object3D(), []);
  const reveal = useRef(0);

  // The skyline is up from as soon as the last stretch of road is in view.
  const visible = () => {
    const s = frameState.s;
    // Stays up while the camera pulls away toward the writing scene.
    return (s > 3.85 && s < PLAZA_S.end + 0.45 && frameState.cameraZ - z0 < 120) || frameState.overview > 0.4;
  };
  // The caption belongs to the overhead view.
  const captionCue = () => {
    const s = frameState.s;
    const t = (s - (PLAZA_S.overhead - 0.03)) / 0.04;
    if (t < 0) return -1;
    return s > PLAZA_S.end - 0.02 ? 1 + Math.min((s - (PLAZA_S.end - 0.02)) / 0.03, 0.99) : Math.min(t, 1);
  };
  const caption = useCueFade(captionCue);
  const monthEls = useRef<(HTMLDivElement | null)[]>([]);

  useFrame((_, dt) => {
    const g = root.current;
    if (!g) return;
    g.visible = visible();
    // Month labels show as the camera starts craning up over the city.
    const showMonths = g.visible && frameState.s > PLAZA_S.street + (PLAZA_S.overhead - PLAZA_S.street) * 0.5 && frameState.overview < 0.3;
    for (const el of monthEls.current) if (el) el.style.opacity = showMonths ? "1" : "0";
    if (!g.visible) {
      reveal.current = 0;
      return;
    }
    // Towers rise in a wave, oldest week first, the first time the city comes into view.
    reveal.current = Math.min(reveal.current + dt * 0.7, 1.6);
    for (const kind of ["body", "hot"] as const) {
      const mesh = meshes.current[kind];
      if (!mesh) continue;
      groups[kind].forEach((b, i) => {
        const t = clamp01((reveal.current - (b.col / cols) * 0.6) / 0.5);
        const h = Math.max(b.h * (1 - Math.pow(1 - t, 3)), 0.001);
        dummy.position.set(b.x, ROAD_Y + 0.06 + h / 2, b.z);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      // Raycasts test this sphere first; it must follow the towers, not the origin.
      if (reveal.current < 1.6 || !mesh.boundingSphere) mesh.computeBoundingSphere();
    }
  });

  const hover = (kind: "body" | "hot") => ({
    onPointerMove: (e: { stopPropagation: () => void; instanceId?: number }) => {
      e.stopPropagation();
      const b = e.instanceId === undefined ? undefined : groups[kind][e.instanceId];
      if (b) document.documentElement.dataset.cursorLabel = `${b.date} · ${b.count}`;
    },
    onPointerOut: () => {
      delete document.documentElement.dataset.cursorLabel;
    },
  });

  return (
    <group ref={root}>
      <mesh geometry={slab} material={mats.slab} position={[x0, ROAD_Y, z0]} />
      {(["body", "hot"] as const).map((kind) => (
        <instancedMesh
          key={kind}
          ref={(m) => {
            meshes.current[kind] = m;
          }}
          args={[geometry, kind === "hot" ? mats.hot : mats.body, Math.max(groups[kind].length, 1)]}
          frustumCulled={false}
          {...hover(kind)}
        />
      ))}
      {/* Month labels along the front of the city: real text, crisp at any angle. */}
      {months.map((m, i) => (
        <Html
          key={`${m.text}${i}`}
          transform
          distanceFactor={(portrait ? DF * 2.5 : DF * 4) / CRISP}
          portal={layer}
          position={[m.x - CELL / 2 + 0.6, ROAD_Y + 0.1, z0 + 4 * CELL + 1.2]}
          rotation={[-1.0, 0, 0]}
          style={{ pointerEvents: "none" }}
          zIndexRange={Z_RANGE}
        >
          <div ref={(el) => void (monthEls.current[i] = el)} className="font-mono text-[20px] font-bold tracking-[0.12em] text-ink" style={{ opacity: 0, zoom: CRISP }}>
            {m.text}
          </div>
        </Html>
      ))}
      <Html
        transform
        distanceFactor={(portrait ? DF * 2.4 : DF * 6) / CRISP}
        portal={layer}
        position={[x0, ROAD_Y + 0.2, z0 + 4 * CELL + 4.2]}
        rotation={[-1.0, 0, 0]}
        style={{ pointerEvents: "none" }}
        zIndexRange={Z_RANGE}
      >
        <div ref={caption} className="flex items-baseline gap-4 whitespace-nowrap text-ink" style={{ opacity: 0, zoom: CRISP }}>
          <span className="font-display text-[64px] font-black leading-none text-accent">{github.total}</span>
          <span className="font-mono text-[18px] uppercase tracking-[0.12em]">
            {locale === "zh" ? "次贡献 · 近一年" : "contributions in the last year"}
          </span>
        </div>
      </Html>
    </group>
  );
}

/** The timeline as a ruler-marked road the camera rides, with a sign at every stop. */
export function TimelineStage({ github, locale }: { github: GithubScene; locale: Locale }) {
  const kit = useMarkerKit();
  const layer = useDomLayer(15);
  const { start, end, plazaZ } = WORLD.timeline;
  const road = useMemo(() => buildRoad(start + 16, plazaZ + 5), [start, plazaZ]);
  const roadMat = useMemo(() => {
    const m = createInkMaterial({
      fill: Fill.paper,
      vertexHead: roadVertexHead,
      vertexTransform: roadTransform,
      fragmentHead: roadFragmentHead,
      fragmentPrint: roadPrint,
    });
    m.side = DoubleSide;
    return m;
  }, []);
  useEffect(() => () => road.dispose(), [road]);
  useEffect(() => () => roadMat.dispose(), [roadMat]);
  void end;

  return (
    <group>
      <mesh geometry={road} material={roadMat} />
      {timeline.map((e, i) => (
        <Milestone key={e.date + e.title.en} index={i} kit={kit} locale={locale} layer={layer} />
      ))}
      <ContributionPlaza github={github} locale={locale} layer={layer} />
      <PelicanRider />
    </group>
  );
}
