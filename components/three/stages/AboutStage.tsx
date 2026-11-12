"use client";

import { useThree } from "@react-three/fiber";
import { fitScale } from "../framing";

import { KineticText } from "../text/KineticText";
import { cue, frameState } from "../frameState";
import { WORLD } from "../world";
import { Globe } from "./Globe";

const isPunct = (_: number, c: string) => "();=.".includes(c);

/** "init(me);" assembles out of the dark, holds while you read, then bursts past the lens. */
export function AboutStage() {
  const fit = useThree((s) => fitScale(s.size.width / s.size.height));
  return (
    <group position={[0, 0, WORLD.about.z]} scale={fit}>
      {/* "based: 中国" — the pin sits on the location in content/profile.ts. */}
      <Globe position={[-11, 1.5, -6]} />
      <KineticText
        text="init(me);"
        size={4.4}
        depth={1.3}
        position={[0, 1.1, 0]}
        accent={isPunct}
        progress={() => cue(frameState.s, 0.92, 1.3, 1.8, 2.02)}
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
        progress={() => cue(frameState.s, 1.05, 1.42, 1.74, 1.96)}
      />
    </group>
  );
}
