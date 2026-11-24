/**
 * A tiny Chrome DevTools Protocol client for the promo's frame grabber:
 * launches headless Chrome (SwiftShader WebGL, no GPU needed) and talks to its page.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width, height, dpr = 1, mobile = false }) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = mkdtempSync(join(process.env.CAPTURE_TMP ?? tmpdir(), "qwq-chrome-"));
  const chrome = spawn(
    process.env.CHROME ?? "google-chrome",
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      // CAPTURE_GL=metal films on a Mac's GPU, many times faster; the default needs no GPU.
      ...(process.env.CAPTURE_GL === "metal" ? ["--use-angle=metal"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
      "--ignore-gpu-blocklist",
      "--no-first-run",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--font-render-hinting=none",
      `--window-size=${width},${height}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let url;
  for (let i = 0; i < 80 && !url; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      url = list.find((t) => t.type === "page")?.webSocketDebuggerUrl;
    } catch {}
    if (!url) await sleep(250);
  }
  if (!url) throw new Error("chrome did not start");
  // Node's built-in WebSocket (run with --experimental-websocket on Node 20).
  const ws = new WebSocket(url);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  ws.onmessage = (event) => {
    const d = JSON.parse(event.data);
    if (d.id && pending.has(d.id)) {
      const { resolve, reject } = pending.get(d.id);
      pending.delete(d.id);
      d.error ? reject(new Error(`${d.error.message}`)) : resolve(d.result);
    } else if (d.method) {
      for (const fn of listeners.get(d.method) ?? []) fn(d.params);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id;
      pending.set(i, { resolve, reject });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const once = (method) =>
    new Promise((r) => {
      const fn = (p) => {
        listeners.get(method).delete(fn);
        r(p);
      };
      if (!listeners.has(method)) listeners.set(method, new Set());
      listeners.get(method).add(fn);
    });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result?.value;
  };
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile });
  if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  const close = () => {
    try {
      ws.close();
    } catch {}
    chrome.kill("SIGKILL");
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  };
  return { send, once, evaluate, close, sleep };
}

export { sleep };
