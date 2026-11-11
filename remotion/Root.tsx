import { Composition } from "remotion";
import { DURATION, FPS, YearInReview, type YearInReviewProps } from "./YearInReview";

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
    </>
  );
}
