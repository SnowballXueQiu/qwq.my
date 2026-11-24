/**
 * Masters the raw mix (compose.mjs) to −14 LUFS integrated with a −1 dBTP
 * ceiling: measure, apply the gain, limit. Writes public/promo/bgm.wav.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../../public/promo");
const raw = join(dir, "bgm.raw.wav");
const out = join(dir, "bgm.wav");
const TARGET = -14;

const summary = (file) => {
  const r = require_stderr(["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]);
  const I = Number(r.match(/I:\s+(-?[\d.]+) LUFS/g)?.pop()?.match(/-?[\d.]+/)[0]);
  const peak = Number(r.match(/Peak:\s+(-?[\d.]+) dBFS/g)?.pop()?.match(/-?[\d.]+/)[0]);
  return { I, peak };
};
/** Runs ffmpeg and returns what it printed on stderr (where the loudness summary goes). */
function require_stderr(args) {
  return spawnSync("ffmpeg", args, { encoding: "utf8" }).stderr;
}

const before = summary(raw);
const gain = TARGET - before.I;
require_stderr(["-hide_banner", "-y", "-i", raw, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=0.89:attack=2:release=60:level=false`, "-ar", "48000", "-c:a", "pcm_s24le", out]);
const after = summary(out);
console.log(`bgm: ${before.I} → ${after.I} LUFS, true peak ${after.peak} dBFS → ${out}`);
