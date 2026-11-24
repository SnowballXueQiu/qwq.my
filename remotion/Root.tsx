import { Composition } from "remotion";
import { DURATION, FPS, YearInReview, type YearInReviewProps } from "./YearInReview";
import { DURATION as PROMO_DURATION, FPS as PROMO_FPS, Promo } from "./Promo";

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="YearInReview"
        component={YearInReview}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ locale: "zh" } satisfies YearInReviewProps}
      />
      <Composition
        id="YearInReviewEn"
        component={YearInReview}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{ locale: "en" } satisfies YearInReviewProps}
      />
      {/* The Bilibili promo; render at 4K with --scale=2 (see remotion/Promo/README.md). */}
      <Composition id="Promo" component={Promo} durationInFrames={PROMO_DURATION} fps={PROMO_FPS} width={1920} height={1080} />
    </>
  );
}
