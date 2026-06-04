import { SketchIcon } from "./SketchIcon";

export function DecorativeDoodles() {
  return (
    <div className="doodle-layer" aria-hidden="true">
      <span className="doodle doodle-star one">
        <SketchIcon name="star" />
      </span>
      <span className="doodle doodle-spark two">
        <SketchIcon name="spark" />
      </span>
      <span className="doodle doodle-heart three">
        <SketchIcon name="heart" />
      </span>
      <span className="crayon-loop one"></span>
      <span className="crayon-loop two"></span>
      <span className="paper-scribble one"></span>
      <span className="paper-scribble two"></span>
    </div>
  );
}
