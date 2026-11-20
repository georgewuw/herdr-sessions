# Shared by install.sh and uninstall.sh (sourced, not run).

# Herdr's home is the same on every OS: ~/.config/herdr-app (HERDR_APP_HOME overrides).
APP_HOME="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
LAYOUT="sessions"
MODS=(hs-tabs hs-sessions hs-favorites)
LEGACY_MODS=(hs-files hs-changes hs-spaces)
# Dropped into everything installed from here, so a later install or uninstall
# can tell our files from the user's own.
MARKER=".herdr-sessions"

is_ours() {
  if [ -d "$1" ]; then [ -e "$1/$MARKER" ]
  else [ -e "$(dirname "$1")/.$(basename "$1" .json).installed" ]; fi
}
