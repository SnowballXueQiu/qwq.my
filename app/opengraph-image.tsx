import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

export const alt = "qwq.my — a drawing that tears itself open";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F1EDE4";
const INK = "#141414";
const ACCENT = "#E8402A";

/** The share card: a drawing sheet with QwQ on it, in the site's paper and ink. */
export default async function Image() {
  const display = await readFile(path.join(process.cwd(), "public/fonts/ArchivoCondensed-Black.ttf"));
  const mono = await readFile(path.join(process.cwd(), "public/fonts/JetBrainsMono-Bold.ttf"));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          backgroundImage: `linear-gradient(rgba(20,20,20,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,20,0.07) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          border: `14px solid ${INK}`,
          padding: 56,
          color: INK,
        }}
      >
        <div style={{ display: "flex", fontFamily: "Mono", fontSize: 24, color: ACCENT, letterSpacing: 4 }}>
          SHEET 01 / 07 · DWG QWQ-0100
        </div>
        <svg viewBox="0 0 120 52" width={620} height={268} fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="17" strokeWidth="6" />
          <path d="M35 36 q4 7 10 10" strokeWidth="6" />
          <circle cx="27" cy="26" r="7.5" fill={INK} stroke="none" />
          <circle cx="96" cy="24" r="17" strokeWidth="6" />
          <path d="M107 36 q4 7 10 10" strokeWidth="6" />
          <circle cx="99" cy="26" r="7.5" fill={INK} stroke="none" />
          <path d="M49 23 Q53.5 32 60 25.5 Q66.5 32 71 23" stroke={ACCENT} strokeWidth="5" />
        </svg>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontFamily: "Display", fontSize: 120, lineHeight: 0.85 }}>qwq.my</div>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 26 }}>student / developer</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, style: "normal", weight: 900 },
        { name: "Mono", data: mono, style: "normal", weight: 700 },
      ],
    },
  );
}
