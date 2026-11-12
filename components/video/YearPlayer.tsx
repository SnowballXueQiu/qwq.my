"use client";

import { Player } from "@remotion/player";
import type { YearData } from "@/content/year/2026";
import type { Locale } from "@/lib/i18n";
import { DURATION, FPS, YearInReview } from "@/remotion/YearInReview";

export default function YearPlayer({ locale, data }: { locale: Locale; data: YearData }) {
  return (
    <Player
      component={YearInReview}
      inputProps={{ locale, data }}
      durationInFrames={DURATION}
      fps={FPS}
      compositionWidth={1920}
      compositionHeight={1080}
      controls
      autoPlay
      clickToPlay
      acknowledgeRemotionLicense
      style={{ width: "100%", aspectRatio: "16 / 9" }}
    />
  );
}
