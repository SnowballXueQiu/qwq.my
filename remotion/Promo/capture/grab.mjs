/**
 * Frame grabber for the promo video: drives the real site in headless Chrome
 * under virtual time, one 1/60 s step per frame, and saves every frame. Timers,
 * requestAnimationFrame, Date and CSS animations all run on the virtual clock,
 * so the footage is deterministic and perfectly smooth however slow the
 * (software) renderer is.
 *
 *   node --experimental-websocket remotion/Promo/capture/grab.mjs <shot...> [--preview] [--every=N] [--from=F] [--to=F]
 *
 * --preview captures at 1/4 the pixels (dpr / 2) into footage-preview/, for checking framing quickly.
 * Shots live in shots.mjs. Frames go to public/promo/footage/<shot>/<layer>/00000.jpg,
 * plus track.json (the mouse path, for the big cursor the video draws on top).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./cdp.mjs";
import { shots, SITE } from "./shots.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}`))?.split("=")[1] ?? (args.includes(`--${name}`) ? true : undefined);
const preview = !!flag("preview");
const every = Number(flag("every") ?? 1);
const names = args.filter((a) => !a.startsWith("--"));
const FRAME_MS = 1000 / 60;

/** The browser in use, closed if the grabber is stopped so no headless Chrome is left behind. */
let current = null;
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => (current?.close(), process.exit(130)));

/** Layers, each a stylesheet applied for one extra capture of the same instant. */
const LAYER_CSS = {
  // Only the WebGL world (the canvas sits in the z-0 fixed container).
  world: `body > *:not(.fixed.inset-0.z-0):not(script) { visibility: hidden !important; }`,
  // Only the drawing-sheet frame and HUD, on transparent.
  frame: `html, body { background: transparent !important; }
    body > .fixed.inset-0.z-0, main, body > div[style*="z-index: 14"], body > div[style*="z-index: 15"] { visibility: hidden !important; }`,
  // Only the page content and the in-world labels, on transparent.
  content: `html, body { background: transparent !important; }
    body > .fixed.inset-0.z-0, body > .hud, body > .fixed.inset-0.z-40, body > .fixed.z-40 { visibility: hidden !important; }`,
};

async function grab(shot) {
  const dpr = preview ? Math.max(0.5, shot.dpr / 2) : shot.dpr;
  const root = join(here, "../../../public/promo", preview ? "footage-preview" : "footage", shot.name);
  const layers = ["full", ...(shot.layers ?? [])];
  for (const l of layers) mkdirSync(join(root, l), { recursive: true });

  const b = await launch({ width: shot.width, height: shot.height, dpr, mobile: !!shot.mobile });
  current = b;
  const { send, evaluate, once } = b;
  // Before any page script: mark the page as filmed, skip the boot log unless wanted,
  // and add the shot's own CSS (hiding the site's cursor when the video draws its own).
  await send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__filming = 1;
      // A seeded Math.random, so separate runs of a shot (one per layer) match frame for frame.
      (() => { let a = 0x51ed2a; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
      ${shot.boot ? "" : "try { sessionStorage.setItem('qwq-booted', '1') } catch {}"}
      ${shot.storage ? `try { ${Object.entries(shot.storage).map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)})`).join(";")} } catch {}` : ""}
      document.addEventListener('DOMContentLoaded', () => {
        const st = document.createElement('style');
        st.id = '__film_css';
        st.textContent = ${JSON.stringify((shot.hideCursor ? ".z-\\[200\\] { display: none !important; }\n" : "") + (shot.css ?? "") + (shot.only ? LAYER_CSS[shot.only] : ""))};
        document.head.appendChild(st);
      });`,
  });
  await send("Page.navigate", { url: shot.url.startsWith("http") ? shot.url : SITE + shot.url });
  // Wait for the page (and, on the site, its scroll hooks), then let it warm up.
  for (let i = 0; i < 240; i++) {
    const ready = await evaluate(shot.url.startsWith("http") ? `document.readyState === "complete"` : `!!(window.__film && document.querySelector('[data-sheet]') && document.readyState === "complete")`).catch(() => false);
    if (ready) break;
    await b.sleep(500);
  }
  await b.sleep(shot.warm ?? 8000);
  await evaluate(`window.__film?.measureSheets?.(); 1`);

  const place = async (s) => {
    if (s === undefined) return;
    await evaluate(`(() => {
      const y = window.__film.scrollForSceneTime(${s});
      if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true });
      else window.scrollTo(0, y);
      return 1;
    })()`);
  };
  const scrollPx = async (y) => {
    if (y === undefined) return;
    await evaluate(`(() => { if (window.__lenis) window.__lenis.scrollTo(${y}, { immediate: true, force: true }); else window.scrollTo(0, ${y}); return 1 })()`);
  };

  // Mouse state, applied as diffs so the page sees ordinary pointer events.
  let mouse = { x: -1, y: -1, down: false };
  const moveMouse = async (m) => {
    if (!m) return;
    const down = !!m.down;
    if (m.x !== mouse.x || m.y !== mouse.y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: m.x, y: m.y, button: mouse.down ? "left" : "none", buttons: mouse.down ? 1 : 0, modifiers: m.shift ? 8 : 0 });
    }
    if (down !== mouse.down) {
      await send("Input.dispatchMouseEvent", { type: down ? "mousePressed" : "mouseReleased", x: m.x, y: m.y, button: "left", buttons: down ? 1 : 0, clickCount: 1, modifiers: m.shift ? 8 : 0 });
    }
    mouse = { x: m.x, y: m.y, down };
  };
  const key = async (k) => {
    const def = typeof k === "string" ? { key: k } : k;
    const text = def.text ?? (def.key.length === 1 ? def.key : undefined);
    const code = def.code ?? (def.key.length === 1 ? `Key${def.key.toUpperCase()}` : def.key);
    const vk = def.vk ?? { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, " ": 32, Backspace: 8, Tab: 9 }[def.key] ?? (def.key.length === 1 ? def.key.toUpperCase().charCodeAt(0) : 0);
    await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", key: def.key, code, text, unmodifiedText: text, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: def.key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  };

  const apply = async (st) => {
    if (!st) return;
    if (st.s !== undefined) await place(st.s);
    if (st.y !== undefined) await scrollPx(st.y);
    await moveMouse(st.mouse);
    for (const k of st.keys ?? []) await key(k);
    for (const t of st.type ? [...st.type] : []) await key(t);
    if (st.eval) await evaluate(st.eval);
  };

  const advance = async (ms) => {
    const done = once("Emulation.virtualTimeBudgetExpired");
    await send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: ms });
    await done;
  };

  // A layer-only run on transparent: every frame is captured with alpha.
  const alpha = shot.only && shot.only !== "world";
  if (alpha) await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });

  // From here on the page runs on the virtual clock.
  await send("Emulation.setVirtualTimePolicy", { policy: "pause" });
  await apply(shot.setup);
  // Pre-roll: let the page settle at the starting position (and fall asleep, etc.).
  for (let t = 0; t < (shot.preroll ?? 1000); t += 250) await advance(250);

  const track = [];
  const from = Number(flag("from") ?? 0);
  const to = Number(flag("to") ?? shot.frames);
  const t0 = Date.now();
  // SwiftShader very occasionally never answers a virtual-time budget. Bail out
  // (exit 3) so a wrapper can resume with --from: skipped frames still step the
  // clock, so the resumed run is identical.
  let beat = Date.now();
  const dog = setInterval(() => {
    if (Date.now() - beat > 180_000) {
      console.log(`STALL ${shot.name} after frame ${lastSaved}`);
      b.close();
      process.exit(3);
    }
  }, 10_000);
  let lastSaved = from - 1;
  for (let f = 0; f < to; f++) {
    beat = Date.now();
    const st = shot.at?.(f) ?? {};
    await apply(st);
    await advance(FRAME_MS);
    track.push(mouse.x < 0 ? null : { x: mouse.x, y: mouse.y, down: mouse.down });
    if (f < from || f % every !== 0) continue;
    const file = `${String(f).padStart(5, "0")}`;
    const shotOnce = await send("Page.captureScreenshot", { format: alpha ? "webp" : "jpeg", quality: preview ? 80 : alpha ? 92 : 93, optimizeForSpeed: true });
    writeFileSync(join(root, "full", `${file}.${alpha ? "webp" : "jpg"}`), Buffer.from(shotOnce.data, "base64"));
    lastSaved = f;
    for (const l of shot.layers ?? []) {
      await evaluate(`(() => { let s = document.getElementById('__film_layer'); if (!s) { s = document.createElement('style'); s.id = '__film_layer'; document.head.appendChild(s) } s.textContent = ${JSON.stringify(LAYER_CSS[l])}; return 1 })()`);
      const alpha = l !== "world";
      if (alpha) await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
      // WebP keeps the alpha and encodes far faster than PNG at 4K.
      const img = await send("Page.captureScreenshot", { format: alpha ? "webp" : "jpeg", quality: 92, optimizeForSpeed: true });
      writeFileSync(join(root, l, `${file}.${alpha ? "webp" : "jpg"}`), Buffer.from(img.data, "base64"));
      if (alpha) await send("Emulation.setDefaultBackgroundColorOverride", {});
      await evaluate(`document.getElementById('__film_layer').textContent = ''; 1`);
    }
    if (f % 60 === 0) {
      const s = await evaluate(`window.__film?.getSceneTime?.() ?? -1`);
      console.log(`${shot.name} ${f}/${to}  s=${Number(s).toFixed(3)}  ${((Date.now() - t0) / (f - from + 1)).toFixed(0)} ms/frame`);
    }
  }
  clearInterval(dog);
  writeFileSync(join(root, "track.json"), JSON.stringify({ width: shot.width, height: shot.height, frames: shot.frames, track }));
  b.close();
}

for (const name of names) {
  const shot = shots.find((s) => s.name === name);
  if (!shot) {
    console.error(`no shot "${name}"; shots: ${shots.map((s) => s.name).join(", ")}`);
    process.exit(1);
  }
  await grab(shot);
}
process.exit(0);
