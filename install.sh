#!/usr/bin/env bash
# Herdr Sessions: install the layout and its six mods into the Herdr home.
# Works in macOS/Linux bash and Windows Git Bash.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
LAYOUT="sessions"
MODS=(hs-tabs hs-spaces hs-files hs-changes hs-sessions hs-favorites)
STAMP="$(date +%Y%m%d-%H%M%S)"

die() { echo "error: $*" >&2; exit 1; }

command -v herdr-app >/dev/null 2>&1 || die "herdr-app not found. Install Herdr first (https://herdr.dev)."
[ -d "$APP_HOME" ] || die "$APP_HOME does not exist. Open Herdr once, then run this again."

echo "Installing into $APP_HOME"

# A shown layout keeps its old code, so leave it before replacing files.
herdr-app do layout.switch --name main >/dev/null 2>&1 || true

# Move anything we would replace aside, so uninstall.sh can restore it.
backup() { [ -e "$1" ] && mv "$1" "$1.backup-$STAMP" && echo "  backed up $(basename "$1")"; return 0; }
mkdir -p "$APP_HOME/layouts" "$APP_HOME/mods"
backup "$APP_HOME/layouts/$LAYOUT.json"
for m in "${MODS[@]}"; do backup "$APP_HOME/mods/$m"; done

cp "$HERE/layouts/$LAYOUT.json" "$APP_HOME/layouts/"
for m in "${MODS[@]}"; do cp -R "$HERE/mods/$m" "$APP_HOME/mods/"; done

for m in "${MODS[@]}"; do
  herdr-app check "$APP_HOME/mods/$m" >/dev/null 2>&1 || die "mod $m failed 'herdr-app check'; layout not switched."
done

if herdr-app do layout.switch --name "$LAYOUT" >/dev/null 2>&1; then
  echo "Done. Switched to the '$LAYOUT' layout."
else
  echo "Files installed. Open Herdr, then run: herdr-app do layout.switch --name $LAYOUT"
fi
echo "The right panel starts collapsed: use Files / Changes / Sessions / Favorites in the top bar."
echo "Back to your own layout: herdr-app do layout.switch --name main"
