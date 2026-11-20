#!/usr/bin/env bash
# Herdr Sessions: install the layout and its three mods into the Herdr home.
# Works in macOS/Linux bash and Windows Git Bash.
#
# Anything this would replace is moved to $APP_HOME/backups/<stamp>/ first
# (outside layouts/ and mods/, which Herdr loads), and a manifest records what
# was backed up so uninstall.sh can put exactly that back.
set -euo pipefail

SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERE="$(cd "$SCRIPTS/.." && pwd)" # the repository root: layouts/ and mods/ live there
# shellcheck source=lib.sh
. "$SCRIPTS/lib.sh"

die() { echo "error: $*" >&2; exit 1; }

command -v herdr-app >/dev/null 2>&1 || die "herdr-app not found. Install Herdr first (https://herdr.dev)."
[ -d "$APP_HOME" ] || die "$APP_HOME does not exist. Open Herdr once, then run this again."

# The mods each carry a copy of paths.js (a mod can only import from its own folder).
for m in "${MODS[@]}"; do
  [ ! -e "$HERE/mods/$m/paths.js" ] || cmp -s "$HERE/mods/hs-sessions/paths.js" "$HERE/mods/$m/paths.js" \
    || die "mods/$m/paths.js differs from mods/hs-sessions/paths.js; copy one over the other."
done

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$APP_HOME/backups/$STAMP"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

echo "Installing into $APP_HOME"

# Check the new mods where they stand before touching anything installed.
for m in "${MODS[@]}"; do
  out="$(herdr-app check "$HERE/mods/$m" 2>&1)" || { echo "$out" >&2; die "mod $m failed 'herdr-app check'; nothing was changed."; }
done

# A shown layout keeps its old code, so leave it before replacing files.
herdr-app do layout.switch --name main >/dev/null 2>&1 || true

# Move an installed file or folder aside, unless it is already ours (a
# re-install): ours is simply replaced, never mistaken for an original.
backup() {
  local path="$1" rel="$2"
  [ -e "$path" ] || return 0
  if is_ours "$path"; then rm -rf "$path"; return 0; fi
  mkdir -p "$BACKUP/$(dirname "$rel")"
  mv "$path" "$BACKUP/$rel" || die "could not move $path aside. Quit Herdr and run this again."
  echo "$rel" >> "$BACKUP/manifest"
  echo "  backed up $rel"
}

mkdir -p "$APP_HOME/layouts" "$APP_HOME/mods"
backup "$APP_HOME/layouts/$LAYOUT.json" "layouts/$LAYOUT.json"
for m in "${MODS[@]}"; do backup "$APP_HOME/mods/$m" "mods/$m"; done

# Mods this project used to ship: ours, so just removed.
for m in "${LEGACY_MODS[@]}"; do
  [ -e "$APP_HOME/mods/$m" ] && rm -rf "$APP_HOME/mods/$m" && echo "  removed old mod $m"
done

cp "$HERE/layouts/$LAYOUT.json" "$APP_HOME/layouts/"
for m in "${MODS[@]}"; do
  # Only the mod's own files: the .d.ts and jsconfig.json beside them are written by Herdr.
  mkdir -p "$APP_HOME/mods/$m"
  for f in "$HERE/mods/$m"/*; do
    case "$(basename "$f")" in gpui-kit.d.ts|herdr.d.ts|jsconfig.json) continue ;; esac
    cp -R "$f" "$APP_HOME/mods/$m/"
  done
  touch "$APP_HOME/mods/$m/$MARKER"
done
touch "$APP_HOME/layouts/.$LAYOUT.installed"

if herdr-app do layout.switch --name "$LAYOUT" >/dev/null 2>&1; then
  echo "Done. Switched to the '$LAYOUT' layout."
else
  echo "Files installed. Open Herdr, then run: herdr-app do layout.switch --name $LAYOUT"
fi
[ -f "$BACKUP/manifest" ] && echo "Originals kept in $BACKUP (uninstall.sh puts them back)."
echo "The right panel starts collapsed: use Sessions / Favorites in the top bar."
echo "Back to your own layout: herdr-app do layout.switch --name main"
