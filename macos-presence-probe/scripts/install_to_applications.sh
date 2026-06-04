#!/bin/sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
APP_DIR="$ROOT_DIR/dist/Presence Probe.app"

if [ ! -d "$APP_DIR" ]; then
  sh "$ROOT_DIR/scripts/package_app.sh"
fi

rm -rf "/Applications/Presence Probe.app"
cp -R "$APP_DIR" "/Applications/Presence Probe.app"
echo "/Applications/Presence Probe.app"
