import { C } from "./theme";

type Eye = "Q" | "^" | "-";

/**
 * Frame-driven QwQ for the video. Same drawing as the site logo, but every
 * moving part is a prop so a render is exactly reproducible.
 */
export function QwQFace({
  width,
  draw = 1,
  look = [0, 0],
  blink = 0,
  eyes = "Q",
  mouth = "w",
  wave,
  color = C.ink,
}: {
  width: number;
  /** 0–1: how much of each stroke is drawn. */
  draw?: number;
  /** Pupil offset, each axis −1…1. */
  look?: [number, number];
  /** 0 open, 1 shut. */
  blink?: number;
  eyes?: Eye;
  mouth?: "w" | "ω";
  /** Waving hand angle in degrees, or undefined for no hand. */
  wave?: number;
  color?: string;
}) {
  const dash = { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - draw };
  const travel = 6;
  return (
    <svg viewBox="-4 -8 150 66" width={width} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      {[24, 96].map((cx) => (
        <g key={cx}>
          {eyes === "Q" && (
            <>
              <circle cx={cx} cy={24} r={17} strokeWidth={6} {...dash} />
              <path d={`M${cx + 11} 36 q4 7 10 10`} strokeWidth={6} {...dash} />
              <g
                transform={`translate(${cx + look[0] * travel} ${24 + look[1] * travel}) scale(1 ${1 - blink * 0.9})`}
                opacity={draw > 0.6 ? 1 : 0}
              >
                <circle r={7.5} fill={color} stroke="none" />
                <circle cx={-2.6} cy={-2.8} r={2.2} fill={color === C.ink ? C.paper : C.ink} stroke="none" />
              </g>
            </>
          )}
          {eyes === "^" && <path d={`M${cx - 13} 30 Q${cx} 8 ${cx + 13} 30`} strokeWidth={6} {...dash} />}
          {eyes === "-" && <path d={`M${cx - 13} 24 H${cx + 13}`} strokeWidth={6} {...dash} />}
        </g>
      ))}
      <path
        d={mouth === "w" ? "M49 23 Q53.5 32 60 25.5 Q66.5 32 71 23" : "M47 22 Q50 34 60 27 Q70 34 73 22"}
        strokeWidth={5}
        {...dash}
      />
      {wave !== undefined && (
        <path d="M120 40 q2 -10 10 -18" strokeWidth={6} transform={`rotate(${wave} 120 40)`} />
      )}
    </svg>
  );
}
