#!/usr/bin/env bash
# Herdr Sessions: remove the layout and its mods, then put back whatever
# install.sh moved aside (the newest backup that holds each item).
set -euo pipefail

SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$SCRIPTS/lib.sh"

[ -d "$APP_HOME" ] || { echo "error: $APP_HOME does not exist." >&2; exit 1; }

# Leave our layout first, so the files being removed are not in use.
herdr-app do layout.switch --name main >/dev/null 2>&1 || true

# Remove only what is ours: a folder or layout the user put there since is left alone.
if [ -e "$APP_HOME/layouts/$LAYOUT.json" ] && is_ours "$APP_HOME/layouts/$LAYOUT.json"; then
  rm -f "$APP_HOME/layouts/$LAYOUT.json" "$APP_HOME/layouts/.$LAYOUT.installed"
fi
for m in "${MODS[@]}" "${LEGACY_MODS[@]}"; do
  if [ -e "$APP_HOME/mods/$m" ] && is_ours "$APP_HOME/mods/$m"; then rm -rf "$APP_HOME/mods/$m"; fi
done

# Newest backup first: it holds the original unless a later install found only our own files.
restore() {
  local rel="$1" b
  [ ! -e "$APP_HOME/$rel" ] || return 0
  for b in $(ls -1d "$APP_HOME"/backups/*/ 2>/dev/null | sort -r); do
    if [ -e "$b$rel" ]; then
      mkdir -p "$(dirname "$APP_HOME/$rel")"
      mv "$b$rel" "$APP_HOME/$rel" && echo "  restored $rel"
      return 0
    fi
  done
}
restore "layouts/$LAYOUT.json"
for m in "${MODS[@]}"; do restore "mods/$m"; done

echo "Done. Saved favorites and tags stay in shared.json (hs.favorites, hs.sessions.tags)."
