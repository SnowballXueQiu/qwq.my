import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { loadVideoFonts } from "../YearInReview/theme";
import { DURATION, FPS, from, len, type SectionName } from "./edit";
import { Cta, Dual, Draw, Eggs, End, Hook, Lang, Pano, Tear, Tour, Wake } from "./scenes";

export { DURATION, FPS };

const SCENES: Record<SectionName, () => React.ReactNode> = {
  hook: Hook,
  draw: Draw,
  wake: Wake,
  tear: Tear,
  pano: Pano,
  tour: Tour,
  dual: Dual,
  lang: Lang,
  eggs: Eggs,
  cta: Cta,
  end: End,
};

/**
 * qwq.my, the promo: three minutes, 60 fps, rendered at 4K with --scale=2.
 * Footage is the real site, filmed frame by frame (capture/grab.mjs); the pen,
 * the cursor, the type and the music are drawn here.
 */
export function Promo() {
  loadVideoFonts();
  return (
    <AbsoluteFill style={{ background: "#141414" }}>
      {(Object.keys(SCENES) as SectionName[]).map((name) => {
        const Scene = SCENES[name];
        return (
          <Sequence key={name} name={name} from={from(name)} durationInFrames={len(name)}>
            <Scene />
          </Sequence>
        );
      })}
      <Audio src={staticFile("promo/bgm.wav")} />
    </AbsoluteFill>
  );
}
