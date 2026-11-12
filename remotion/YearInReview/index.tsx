import { AbsoluteFill, Sequence } from "remotion";
import { year2026, type YearData } from "@/content/year/2026";
import type { Locale } from "@/lib/i18n";
import { BigYear, Boot, Heatmap, Highlights, Outro, Projects, Stats } from "./scenes";
import { loadVideoFonts } from "./theme";

export type YearInReviewProps = { locale: Locale; data?: YearData };

export const FPS = 30;

/** Scene lengths in frames; the order is the edit. */
const SCENES = [
  ["boot", 130],
  ["year", 180],
  ["stats", 170],
  ["heatmap", 150],
  ["projects", 150],
  ["highlights", 170],
  ["outro", 120],
] as const;

export const DURATION = SCENES.reduce((a, [, d]) => a + d, 0);

/** Start frame of each scene, computed once. */
const STARTS = SCENES.map((_, i) => SCENES.slice(0, i).reduce((a, [, d]) => a + d, 0));

/** "My 2026" — the year as a 40-second film cut in the site's paper-and-ink language. */
export function YearInReview({ locale, data = year2026 }: YearInReviewProps) {
  loadVideoFonts();
  return (
    <AbsoluteFill style={{ background: "#141414" }}>
      {SCENES.map(([name, length], i) => {
        const from = STARTS[i];
        const scene = {
          boot: <Boot locale={locale} />,
          year: <BigYear year={data.year} />,
          stats: <Stats data={data} locale={locale} />,
          heatmap: <Heatmap data={data} locale={locale} />,
          projects: <Projects year={data.year} locale={locale} />,
          highlights: <Highlights data={data} locale={locale} />,
          outro: <Outro locale={locale} />,
        }[name];
        return (
          <Sequence key={name} name={name} from={from} durationInFrames={length}>
            {scene}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
