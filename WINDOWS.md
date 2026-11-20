# Windows notes

Herdr Sessions runs on Windows through **Git Bash** (`bash install.sh`); the mods themselves are
the same on every OS and check `window().platform` where they differ.

| | Windows | macOS / Linux |
| --- | --- | --- |
| Herdr home | `%USERPROFILE%\.config\herdr-app` (`~/.config/herdr-app` in Git Bash) | `~/.config/herdr-app` |
| Python | first of `python3`, `python`, `py -3` that prints `1` (the Microsoft Store `python3` stub does not) | same |
| Starting `pi` / `claude` | through `cmd /c` (npm launchers are shims and `.cmd` files that can't be spawned directly) | directly |
| Folders | compared case-insensitively with `\` and `/` treated alike | case-insensitive on macOS, exact on Linux |
| Window buttons | drawn by `hs-tabs` (own icons in `mods/hs-tabs/win-*.svg`) | macOS: system buttons, tabs padded past them |

Folder comparison lives in one place, `mods/*/paths.js`; the scan of pi and Claude Code records is
`mods/hs-sessions/scan.py`. Both honour `PI_CODING_AGENT_DIR` and `CLAUDE_CONFIG_DIR` where relevant.

If a mod folder is locked while installing ("could not move ... aside"), quit Herdr and run
`install.sh` again.
