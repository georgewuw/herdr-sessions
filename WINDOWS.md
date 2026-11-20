# Herdr Sessions on Windows: adaptation notes

Status: **not installed**. Review the diff (`git diff`), then run `bash install.sh` yourself.

## What this PC has (measured)

| | |
|---|---|
| Herdr home | `C:\Users\GeorgeWu\.config\herdr-app` |
| python | `python` works (Miniconda). `python3` is the Microsoft Store stub and exits 49 |
| pi | `~/.pi/agent/bin/pi` (POSIX shim). `exec("pi")` fails ENOENT, `exec("pi.cmd")` fails EINVAL, `cmd /c pi` works |
| claude | `~/.local/bin/claude.exe` |
| sqlite3 | not installed (no longer used) |

## Changes

**hs-sessions**
- Windows agents record `cwd` as `E:\a\b`. Paths are now compared with `norm()`/`inside()`
  (backslashes to `/`, case-insensitive, boundary-safe so `x-old` is not inside `x`). Unit-tested.
  `~` shortening uses the same comparison. The original spelling is passed to `terminal.open`.
- pi 1.5 stores `sessions/--<path>--/<ts>_<id>.jsonl`; the scan now globs one level deeper too and
  skips `subagent-artifacts/` (those transcripts are not sessions).
- Picks the first of `python3` / `python` that really prints `1`; no python means an empty list.
- Starts pi and claude through `cmd /c <name>` on Windows, directly elsewhere. The hard-coded
  `~/.npm-global/bin/...` paths are gone (bare names on PATH instead).
- opencode support was removed entirely (it was not wanted); `sqlite3` is no longer needed.

**hs-files / hs-changes**: removed (Files and Changes panels dropped).

**hs-spaces**: `base()` and repo-name parsing split on `/` and `\`.

**install.sh / uninstall.sh**: simplified and English only. install backs up what it replaces,
copies the layout and four mods, runs `herdr-app check` on each, then switches layout. uninstall
removes them and restores the oldest backup of each.

## Not changed / unverified
- `hs-tabs` already had Windows window-button code; untouched.
- README/RECIPE only had opencode and the "install.sh reports missing programs" claim removed.
- Runtime behaviour inside the live Herdr window is untested: only `herdr-app check`, the matcher
  tests, and the PowerShell listing command were run. `check` does not run async code.
- `cmd /c pi` as a `terminal.open` argv is untested inside Herdr (verified only with Node spawn).
- This machine has no pi session files yet, so the pi scan path is checked against pi's docs only.
