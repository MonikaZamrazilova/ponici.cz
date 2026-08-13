#!/bin/sh
# Initial seed obsahu na perzistentní disk.
#
# Spouští se při startu kontejneru PŘED `next start` (viz Dockerfile CMD).
#
# Pravidla:
#  - je-li /app/content (perzistentní disk) prázdný → zkopíruje verzovaný
#    seed z /app/seed-content (manifesty, store, audity) do /app/content
#  - existuje-li na disku jakýkoli manifest → NIC se nepřepisuje
#    (disk je zdroj pravdy; image se po prvním seedu stává nepovinným)
#  - runtime data (sessions, secrets, media uploady) do seedu nepatří —
#    vylučuje je .dockerignore

set -u

# (env proměnné umožňují otestování skriptu mimo kontejner)
SEED=${SEED:-/app/seed-content}
DATA=${DATA:-/app/content}

if [ ! -d "$SEED" ]; then
  echo "[seed] /app/seed-content nenalezeno (obraz bez content/) — přeskakuji"
  exit 0
fi

# Marker: existuje na disku alespoň jeden manifest projektu?
if find "$DATA/projects" -name manifest.json -type f 2>/dev/null | grep -q .; then
  echo "[seed] /app/content už obsahuje data — nepřepisuji"
  exit 0
fi

echo "[seed] /app/content je prázdné — kopíruji verzovaný obsah z obrazu"
mkdir -p "$DATA"
cp -a "$SEED/." "$DATA/"

echo "[seed] hotovo:"
find "$DATA/projects" -name manifest.json -type f | sed 's/^/  /'
exit 0
