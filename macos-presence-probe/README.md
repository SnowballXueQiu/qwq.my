# macOS Presence Probe

Small macOS Swift probe that reports local presence into the Next.js app.

It sends:

- online/offline state
- frontmost app name and bundle id
- frontmost window title
- best-effort editor file/workspace from VS Code/Cursor/Xcode window titles
- current git branch for the configured repo root

Run the command-line probe from this folder:

```sh
swift run PresenceProbe --endpoint http://localhost:3000/api/presence --repo-root .. --location Shanghai --interval 10
```

Stop with `Ctrl+C`; the probe sends one final `offline` heartbeat.

Run the macOS UI app during development:

```sh
swift run PresenceProbeApp
```

Build a clickable macOS app bundle:

```sh
sh scripts/package_app.sh
open "dist/Presence Probe.app"
```

Install it into Applications:

```sh
sh scripts/install_to_applications.sh
```

The app UI stores:

- target URL
- repo root
- province
- device name
- heartbeat interval

Use the Start/Stop button to control reporting.

Notes:

- macOS may ask for Screen Recording or Automation permissions before window titles are visible.
- VS Code does not expose the full active editor path to ordinary system APIs. The probe reads the window title and resolves the file name inside `--repo-root` when it can.
- The website treats a heartbeat older than 45 seconds as offline.
