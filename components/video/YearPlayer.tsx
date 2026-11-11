"use client";

import { Player } from "@remotion/player";
import type { Locale } from "@/lib/i18n";
import { DURATION, FPS, YearInReview } from "@/remotion/YearInReview";

export default function YearPlayer({ locale }: { locale: Locale }) {
  return (
    <Player
      component={YearInReview}
      inputProps={{ locale }}
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
