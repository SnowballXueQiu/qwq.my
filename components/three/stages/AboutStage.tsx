"use client";

import { useThree } from "@react-three/fiber";
import { fitScale } from "../framing";

import { KineticText } from "../text/KineticText";
import { cue, frameState } from "../frameState";
import { WORLD } from "../world";
import { ChinaMap } from "./ChinaMap";
import type { Locale } from "@/lib/i18n";

const isPunct = (_: number, c: string) => "();=.".includes(c);

/**
 * "init(me);" assembles out of the dark, holds while you read, then bursts past
 * the lens; then the camera turns to the footprints map.
 */
export function AboutStage({ locale }: { locale: Locale }) {
  const fit = useThree((s) => fitScale(s.size.width / s.size.height));
  const { map } = WORLD.about;
  return (
    <>
    <ChinaMap locale={locale} position={[map.x, map.y, map.z]} />
    <group position={[0, 0, WORLD.about.z]} scale={fit}>
      <KineticText
        text="init(me);"
        size={4.4}
        depth={1.3}
        position={[0, 1.1, 0]}
        accent={isPunct}
        progress={() => cue(frameState.s, 0.92, 1.25, 1.55, 1.68)}
      />
      <KineticText
        font="mono"
        text="const me = new Student();"
        size={0.62}
        depth={0.18}
        position={[0, -2.5, 1.2]}
        scatter={9}
        seed={4}
        accent={isPunct}
        progress={() => cue(frameState.s, 1.02, 1.3, 1.5, 1.64)}
      />
    </group>
    </>
  );
}
