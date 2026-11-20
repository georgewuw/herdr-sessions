#!/usr/bin/env bash
# Herdr Sessions: choose to install or uninstall.
#
#   bash setup.sh              ask which
#   bash setup.sh install      no questions
#   bash setup.sh uninstall
#
# The work is in scripts/install.sh and scripts/uninstall.sh; this only picks one.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run() { exec bash "$ROOT/scripts/$1.sh"; }

case "${1:-}" in
  install | uninstall) run "$1" ;;
  "") ;;
  *) echo "usage: bash setup.sh [install|uninstall]" >&2; exit 2 ;;
esac

[ -t 0 ] || { echo "usage: bash setup.sh [install|uninstall]" >&2; exit 2; }

echo "Herdr Sessions"
echo
echo "  1) Install"
echo "  2) Uninstall"
echo "  q) Quit"
echo
while true; do
  read -r -p "Choose [1/2/q]: " choice || exit 0
  case "$choice" in
    1 | i | install) run install ;;
    2 | u | uninstall) run uninstall ;;
    q | Q | "") exit 0 ;;
    *) echo "Please enter 1, 2 or q." ;;
  esac
done
