#!/usr/bin/env bash
# Herdr Sessions: remove the layout and its mods, restoring install-time backups.
set -euo pipefail

APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
LAYOUT="sessions"
MODS=(hs-tabs hs-spaces hs-sessions hs-favorites)

[ -d "$APP_HOME" ] || { echo "error: $APP_HOME does not exist." >&2; exit 1; }

herdr-app do layout.switch --name main >/dev/null 2>&1 || true

rm -f "$APP_HOME/layouts/$LAYOUT.json"
for m in "${MODS[@]}"; do rm -rf "$APP_HOME/mods/$m"; done

# Restore the oldest backup of each (the original), if there is one.
restore() {
  local b
  for b in "$1".backup-*; do
    [ -e "$b" ] && [ ! -e "$1" ] && mv "$b" "$1" && echo "  restored $(basename "$1")"
  done
  return 0
}
restore "$APP_HOME/layouts/$LAYOUT.json"
for m in "${MODS[@]}"; do restore "$APP_HOME/mods/$m"; done

echo "Done. Saved favorites and tags stay in shared.json (hs.favorites, hs.sessions.tags)."
