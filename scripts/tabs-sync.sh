#!/usr/bin/env bash
# Keep mods/hs-tabs in step with Herdr's own `tabs` mod.
#
# hs-tabs is Herdr's `tabs` plus a handful of deltas. Three files hold that:
#   vendor/herdr/tabs/main.js       upstream, as Herdr shipped it
#   vendor/herdr/tabs/SOURCE        the app version and the date it came from
#   vendor/herdr/tabs/hs-tabs.patch the whole difference
# mods/hs-tabs/main.js is that snapshot with the patch applied, so an upstream
# update is taken by moving the snapshot and re-applying the deltas.
#
#   bash scripts/tabs-sync.sh            where upstream, the snapshot and hs-tabs stand
#   bash scripts/tabs-sync.sh pull [DIR] copy the installed tabs mod into vendor/
#
# DIR defaults to Herdr's own mods/tabs; point it at any tabs mod folder
# (a new Herdr release unpacked somewhere, say).
#
# Runs on Windows Git Bash and on macOS/Linux: only common option spellings
# (`diff -L`, no GNU-only flags) and no machine-specific path in SOURCE.
set -euo pipefail

SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HERE="$(cd "$SCRIPTS/.." && pwd)" # the repository root: mods/ and vendor/ live there
# shellcheck source=lib.sh
. "$SCRIPTS/lib.sh"

VENDOR="$HERE/vendor/herdr/tabs"
SNAPSHOT="$VENDOR/main.js"
PATCH="$VENDOR/hs-tabs.patch"
SOURCE="$VENDOR/SOURCE"
MOD="$HERE/mods/hs-tabs/main.js"
UPSTREAM="$APP_HOME/mods/tabs"

die() { echo "error: $*" >&2; exit 1; }

usage() { sed -n '11,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; }

# Herdr ships the file with the platform's line endings, so one ending here
# means the snapshot compares equal on Windows and on macOS/Linux and the same
# patch applies to both. Everything this script writes is LF.
lf() { tr -d '\r' < "$1"; }

# A field of the SOURCE file this script writes ("herdr=0.1.18").
field() { sed -n "s/^$1=//p" "$SOURCE" 2>/dev/null | head -1; }

# The snapshot with the patch applied, at $1. Silent: callers only ask whether
# it still applies.
apply_to() {
  local out="$1" dir rc=0
  if [ ! -s "$PATCH" ]; then lf "$SNAPSHOT" > "$out"; return 0; fi
  dir="$(mktemp -d)"
  lf "$SNAPSHOT" > "$dir/main.js"
  (cd "$dir" && patch -p1 < "$PATCH" >/dev/null 2>&1) || rc=1
  if [ $rc -eq 0 ]; then lf "$dir/main.js" > "$out"; fi
  rm -rf "$dir"
  return $rc
}

status() {
  local bad=0 work got
  [ -f "$SNAPSHOT" ] || die "no snapshot at $SNAPSHOT; run: bash scripts/tabs-sync.sh pull"
  work="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$work'" EXIT

  echo "snapshot   tabs $(field herdr)  synced $(field synced)"
  echo "           $SNAPSHOT"

  if [ ! -f "$UPSTREAM/main.js" ]; then
    echo "upstream   not installed at $UPSTREAM (pass a folder to pull)"
  else
    got="$work/upstream.js"
    lf "$UPSTREAM/main.js" > "$got"
    if cmp -s "$got" "$SNAPSHOT"; then
      echo "upstream   same as the snapshot  ($UPSTREAM)"
    else
      bad=1
      echo "upstream   CHANGED since the snapshot  ($UPSTREAM)"
      diff -u -L snapshot/main.js -L upstream/main.js "$SNAPSHOT" "$got" || true
      echo "           take it with: bash scripts/tabs-sync.sh pull"
    fi
  fi

  if [ ! -f "$MOD" ]; then
    bad=1
    echo "hs-tabs    missing  ($MOD)"
  elif apply_to "$work/built.js"; then
    if cmp -s "$work/built.js" "$MOD"; then
      echo "hs-tabs    snapshot + patch, nothing else"
    else
      bad=1
      echo "hs-tabs    DIFFERS from snapshot + patch  ($MOD)"
      diff -u -L snapshot+patch/main.js -L mods/hs-tabs/main.js "$work/built.js" "$MOD" || true
      echo "           hs-tabs needs rebuilding, or the difference recording"
    fi
  else
    bad=1
    echo "hs-tabs    the patch no longer applies to the snapshot  ($PATCH)"
    echo "           port the deltas onto $SNAPSHOT and rebuild hs-tabs from it"
  fi

  return $bad
}

pull() {
  local src="${1:-}" version=unknown work rc=0 oldver same=0
  [ -n "$src" ] || src="$UPSTREAM"
  if [ ! -f "$src/main.js" ]; then
    [ "$src" != "$UPSTREAM" ] || die "Herdr's own tabs mod is not at $UPSTREAM; open Herdr once, or pass a folder"
    die "no main.js in $src"
  fi
  [ "$src/main.js" -ef "$SNAPSHOT" ] 2>/dev/null && die "$src/main.js is the snapshot itself"

  work="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$work'" EXIT

  # Copy aside first: a failed read must not leave an empty snapshot behind.
  lf "$src/main.js" > "$work/main.js"
  if [ -f "$src/mod.json" ]; then lf "$src/mod.json" > "$work/mod.json"; fi
  [ -f "$SNAPSHOT" ] && cmp -s "$work/main.js" "$SNAPSHOT" && same=1
  oldver="$(field herdr)"

  if command -v herdr-app >/dev/null 2>&1; then
    version="$(herdr-app --version 2>/dev/null | grep -Eo '[0-9]+\.[0-9]+\.[0-9]+' | head -1)" || true
    [ -n "$version" ] || version=unknown
  fi

  # Provenance only: version and date. No path, so the file says nothing about
  # whose machine it was taken on.
  {
    echo "mod=tabs"
    echo "herdr=$version"
    echo "synced=$(date +%Y-%m-%d)"
  } > "$work/SOURCE"

  mkdir -p "$VENDOR"
  mv "$work/main.js" "$SNAPSHOT"
  if [ -f "$work/mod.json" ]; then mv "$work/mod.json" "$VENDOR/mod.json"; fi

  # Same upstream as last time: keep the recorded date, so a re-run is not a diff.
  if [ "$same" = 1 ] && [ "$version" = "$oldver" ] && [ -f "$SOURCE" ]; then
    :
  else
    mv "$work/SOURCE" "$SOURCE"
  fi

  echo "snapshot   tabs $version  -> $VENDOR  (from $src)"

  if apply_to "$work/built.js"; then
    if cmp -s "$work/built.js" "$MOD"; then
      echo "patch      still applies; hs-tabs needs no change"
    else
      echo "patch      still applies, but upstream moved under it; hs-tabs is stale:"
      diff -u -L mods/hs-tabs/main.js -L snapshot+patch/main.js "$MOD" "$work/built.js" || true
      rc=1
    fi
  else
    echo "patch      no longer applies to the new snapshot; port the deltas below onto"
    echo "           $SNAPSHOT, then rebuild hs-tabs from it"
    diff -u -L vendor/herdr/tabs/main.js -L mods/hs-tabs/main.js "$SNAPSHOT" "$MOD" || true
    rc=1
  fi
  return $rc
}

case "${1:-status}" in
  status | check) status ;;
  pull) shift || true; pull "${1:-}" ;;
  -h | --help | help) usage; exit 0 ;;
  *) usage >&2; exit 2 ;;
esac
