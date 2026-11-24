#!/usr/bin/env bash
# Film shots one after another, resuming a shot from its last saved frame if
# the grabber stalls (exit 3). Usage: resume.sh <shot...>
cd "$(dirname "$0")/../../.."
for shot in "$@"; do
  for try in 1 2 3 4 5 6; do
    dir=public/promo/footage/$shot/full
    n=$(ls "$dir" 2>/dev/null | wc -l)
    from=$(( n > 0 ? n - 1 : 0 ))   # redo the last file, it may be partial
    node --experimental-websocket remotion/Promo/capture/grab.mjs "$shot" --from=$from && break
    [ $? -eq 3 ] || exit 1
  done
done
