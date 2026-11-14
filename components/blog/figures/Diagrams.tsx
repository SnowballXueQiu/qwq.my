import { tr, type Lang } from "./Figure";

/** A box with a title and a few mono lines, in drawing style. */
function Box({ x, y, w, h, title, lines, dark = false, accent = false }: { x: number; y: number; w: number; h: number; title: string; lines: string[]; dark?: boolean; accent?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={dark ? "#141414" : "#f1ede4"} stroke={accent ? "#e8402a" : "#141414"} strokeWidth={accent ? 2 : 1.2} />
      <text x={x + 8} y={y + 18} className={`font-mono text-[11px] font-bold ${dark ? "fill-[#f1ede4]" : "fill-[#141414]"}`}>
        {title}
      </text>
      {lines.map((l, i) => (
        <text key={i} x={x + 8} y={y + 34 + i * 13} className={`font-mono text-[9.5px] ${dark ? "fill-[#cfc9bd]" : "fill-[#5b5850]"}`}>
          {l}
        </text>
      ))}
    </g>
  );
}

/** An arrow whose dashes flow toward the head (still for reduced motion). */
function Flow({ d, label, lx, ly, dotted = false }: { d: string; label?: string; lx?: number; ly?: number; dotted?: boolean }) {
  return (
    <g>
      <path d={d} fill="none" stroke="#e8402a" strokeWidth={1.6} strokeDasharray={dotted ? "2 4" : "6 4"} className="flow-dash" markerEnd="url(#arrowHead)" />
      {label && (
        <text x={lx} y={ly} className="fill-[#e8402a] font-mono text-[9px]">
          {label}
        </text>
      )}
    </g>
  );
}

const Defs = () => (
  <defs>
    <marker id="arrowHead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#e8402a" />
    </marker>
  </defs>
);

/** Scene → G-buffer → ink composite → lens → screen. */
export function PipelineDiagram({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 640 300" className="block w-full">
      <Defs />
      <Box x={14} y={20} w={150} h={96} title={tr(lang, "① 场景", "① Scene")} lines={[tr(lang, "所有物体同一种材质", "one material for all"), "inkMaterial (GLSL3)", tr(lang, "半兰伯特光照", "half-Lambert light"), tr(lang, "每个材质一个 id", "an id per material")]} />
      <Box
        x={200}
        y={10}
        w={210}
        h={116}
        dark
        title="② G-buffer (MRT)"
        lines={["gColor.r  tone", "gColor.g  accent", "gColor.b  fill", "gNormal.xyz  normal", "gNormal.a  object id", "depth  (depthTexture)"]}
      />
      <Box x={446} y={20} w={180} h={96} accent title={tr(lang, "③ 合成", "③ Composite")} lines={[tr(lang, "8 邻域边缘 → 墨线", "8-neighbour edges → lines"), tr(lang, "明暗 → 网点 + 排线", "tone → dots + hatching"), tr(lang, "纸纹、纸墨对调", "paper grain, inversion"), tr(lang, "切镜的故障条纹", "glitch bands on cuts")]} />
      <Box x={446} y={176} w={180} h={96} title={tr(lang, "④ 镜头", "④ Lens")} lines={[tr(lang, "色差、CRT 桶形畸变", "aberration, CRT barrel"), tr(lang, "速度线（从消失点）", "speed streaks"), tr(lang, "点击的墨水冲击波", "click shockwave"), tr(lang, "暗角", "vignette")]} />
      <Box x={200} y={176} w={210} h={96} title={tr(lang, "叠加层", "Overlay layer")} lines={[tr(lang, "HUD 圆环、标注线", "HUD rings, leader lines"), tr(lang, "不进 G-buffer：", "skips the G-buffer:"), tr(lang, "直接画在墨线之上", "drawn over the ink")]} />
      <Box x={14} y={176} w={150} h={96} dark title={tr(lang, "⑤ 屏幕", "⑤ Screen")} lines={[tr(lang, "按像素预算决定倍率", "pixel ratio by budget"), tr(lang, "手机 2×，大屏更低", "2× on phones, less on big"), tr(lang, "掉帧只降一次", "steps down once")]} />
      <Flow d="M164,68 H196" />
      <Flow d="M410,68 H442" />
      <Flow d="M536,116 V172" label={tr(lang, "film buffer", "film buffer")} lx={542} ly={150} />
      <Flow d="M410,224 H442" dotted />
      <Flow d="M446,250 H420 Q400,250 400,262 V286 H89 V276" />
    </svg>
  );
}

/** Visitor → Cloudflare → tunnel (dialled out by the server) → cloudflared → web. */
export function DeployDiagram({ lang }: { lang: Lang }) {
  return (
    <svg viewBox="0 0 640 250" className="block w-full">
      <Defs />
      <Box x={14} y={84} w={120} h={70} title={tr(lang, "访客", "Visitor")} lines={["qwq.my", "www.qwq.my → 301"]} />
      <Box x={176} y={60} w={150} h={118} accent title="Cloudflare" lines={[tr(lang, "DNS 只有 Cloudflare 的 IP", "DNS shows only CF IPs"), tr(lang, "CNAME → 隧道", "CNAME → the tunnel"), "HTTPS", tr(lang, "源站 IP 不外露", "origin IP never public")]} />
      {/* The server: dashed fence = no inbound ports. */}
      <rect x={362} y={18} width={264} height={214} fill="none" stroke="#141414" strokeDasharray="8 5" />
      <text x={372} y={36} className="fill-[#141414] font-mono text-[11px] font-bold">
        {tr(lang, "服务器（不开任何入站端口）", "Server (no inbound ports)")}
      </text>
      <rect x={378} y={48} width={232} height={168} fill="#141414" opacity={0.04} stroke="#141414" />
      <text x={386} y={64} className="fill-[#5b5850] font-mono text-[9.5px]">
        docker compose
      </text>
      <Box x={392} y={74} w={204} h={56} dark title="tunnel · cloudflared" lines={[tr(lang, "主动连出去 :7844（http2）", "dials out (http2)")]} />
      <Box x={392} y={150} w={204} h={56} dark title="web · Next standalone" lines={[tr(lang, ":3000，只在 Docker 内网", ":3000, Docker network only")]} />
      <Flow d="M134,119 H172" label="HTTPS" lx={136} ly={112} />
      <Flow d="M392,102 H330" dotted label={tr(lang, "隧道（由服务器发起）", "tunnel (server dials out)")} lx={210} ly={198} />
      <Flow d="M494,130 V146" />
    </svg>
  );
}
