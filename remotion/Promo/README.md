# qwq.my promo (Bilibili)

A three-minute 4K60 film of the site. The site itself is the footage, filmed
frame by frame. The pen, the big cursor, the type and the music are made here.

## How it's made

1. **Footage** (`capture/`): `grab.mjs` opens the real site in headless Chrome
   (SwiftShader WebGL, so no GPU is needed) and runs it on **virtual time**.
   Every timer, `requestAnimationFrame`, `Date` and CSS animation advances
   exactly 1/60 s per frame, so the footage is smooth and repeatable however
   slow the software renderer is. Each shot in `shots.mjs` is a function of the
   frame: scene time `s` (where the page is scrolled to), the mouse, keys.
   `Math.random` is seeded, so separate runs of one shot (one per layer for the
   exploded view) match frame for frame.
2. **Music** (`music/`): `compose.mjs` synthesizes an original track
   (120 BPM, A minor, 90 bars = 3:00) on the same bar grid as the edit, plus
   foley timed to the frame (pen scratch, clicks, keys). `master.mjs`
   normalizes it to −14 LUFS.
3. **Edit** (`edit.ts`, `scenes.tsx`, `kit.tsx`): Remotion composition `Promo`,
   1920×1080 at 60 fps, rendered at `--scale=2` for 3840×2160.

The site has three small hooks for this (`window.__film`, `window.__lenis`, and
`window.__filming`, which turns off scroll snapping); they do nothing unless
the grabber sets them up.

## Make it

```sh
pnpm build && PORT=3100 pnpm start          # the site to film (another terminal)
pnpm promo:capture hero_wake tour …         # or every shot: see shots.mjs
pnpm promo:capture tour --preview --every=20  # quick quarter-size check
pnpm promo:music
pnpm video:studio                            # pick "Promo"
pnpm promo:render                            # → out/qwq-my-promo-4k60.mp4
```

On a Mac, point `CHROME` at Google Chrome and set `CAPTURE_GL=metal` to film on
the GPU: about 150 ms a 4K frame instead of 1.8 s with SwiftShader, and the
frames match (virtual time decides what is drawn, not the renderer). For every
shot, with resume on stalls:

```sh
export CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" CAPTURE_GL=metal
bash remotion/Promo/capture/resume.sh survey phone_survey hero_wake …
```

Footage goes to `public/promo/footage/` (several GB, git-ignored). To check the
edit before the full captures exist, render stills against the preview
captures: `npx remotion still Promo f.png --frame=600 --props='{"preview":true}'`.
