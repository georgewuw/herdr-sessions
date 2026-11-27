# Herdr Sessions

A Herdr layout for people who drive coding agents all day. Spaces and tabs sit on the left, the
terminal in the middle, and one right-hand panel holds **Sessions** and **Favorites** (next to Herdr's own
Files and Changes). The panel is collapsed until the person opens it from the tab bar. Resuming a pi or
Claude Code session takes one click and lands in the folder it was recorded in.

![Herdr Sessions](preview.png)

## What you see

Herdr's default window, unchanged: space and agent lists on the left, the terminal in the middle, a tab bar
on top, a status bar below. Colours and type are the theme's. The differences:

- The tab bar has two more panel buttons, *Sessions* and *Favorites*, after Herdr's *Files* and *Changes*.
- The right panel is hidden at first and holds four panels, one at a time; *Sessions* is the one it opens on.
  - *Sessions*: a header with the title and a count, a search box with a list/tree toggle button, then
    rows. A row is the agent icon, the title, a `+`; below it the age and folder; below that its tags.
  - *Favorites*: a header with the title, a count and a star button; one two-line row per folder (name,
    then `Local · ~/path`) with an "Opened" badge and a ✕; a "Browse folders…" row at the bottom.

## How it behaves

- **Agent status** in the tab bar, as Herdr's own tab bar shows it: `working` a spinner, `blocked` and `done`
  a dot, `idle` nothing.
- **Panel buttons** open their panel and mark themselves selected; clicking the open panel's button collapses
  the panel. Each space remembers which panel it had open.
- **Sessions** lists the current project only (the space's folder, or the focused terminal's folder once
  it has left it). Clicking a row opens a tab named after the session title and resumes it in its folder.
  Hovering tints a row; `+` turns the tag line into an input. `#tag` filters by tag only, several tags must
  all match, `#tag word` is both. The toggle switches a flat list and a tree grouped by agent (collapsible,
  a count beside each group's name); the choice is remembered.
- **Favorites**: the star saves the active space's folder; a row selects the space already on that folder
  (its own folder, or one of its terminals sitting there) or makes a new space; ✕ forgets it.
- Nothing moves unless the person acts, apart from the working spinner and a session rescan every 30s.

## Built from

`layouts/sessions.json` is a copy of Herdr's own `layouts/main.json` with **three changes**. Everything
else (sizes, colours, the sidebar, the terminal pane, the status bar) is whatever `main.json` has, so start
from the current `main.json` and make only these:

1. The `tabs` block shows mod `hs-tabs` instead of `tabs`.
2. The `panel-body` stack gets two more children, after `files` and `changes`: a block `sessions` →
   mod `hs-sessions` and a block `favorites` → mod `hs-favorites`.
3. `panel-body` is `active: "sessions"` instead of `"files"`.

Three mods, each `"place": "none"` with `// @ts-nocheck` on line 1:

- **hs-tabs** — a copy of Herdr's own `tabs` mod with `"sessions"` and `"favorites"` appended to its
  `enabled` list and two more `panelButton`s after Changes; everything else stays as shipped (including
  reading the window-button icons from `mods/tabs/`). A button runs `layout.select { stack: "panel-body",
  child }` and `layout.show` / `layout.hide` on `panel`. Files and Changes still follow `workspace.panels`.
  Because it is a fork, it is kept as **upstream + a patch** (see *Keeping hs-tabs on Herdr's tabs*):
  `vendor/herdr/tabs/` is the upstream copy it was forked from, `vendor/herdr/tabs/hs-tabs.patch` the
  whole difference, and `mods/hs-tabs/main.js` the two combined.
- **hs-sessions** — `main.js` runs `scan.py <home()>` every 30s through `exec` (the first of `python3`,
  `python`, `py -3` that prints `1`; a failed scan keeps the old list and shows the error) and filters,
  tags and launches.
  - pi records: `$PI_CODING_AGENT_DIR` or `~/.pi/agent`, `sessions/*/*.jsonl` and one level deeper, not
    `subagent-artifacts`. `id` and `cwd` from the first line; title from the **last** `session_info` name,
    else the first user message.
  - Claude Code records: `$CLAUDE_CONFIG_DIR` or `~/.claude`, `projects/*/*.jsonl`, not `agent-*`;
    the id is the file's uuid.
  - A folder is the `cwd` recorded in the file, never decoded from the flattened folder name.
  - Resume: `tab.new { name, argv, folder }` with `pi --session <id>` or `claude --resume <id>`, prefixed by
    `cmd /c` on Windows. The name is the title's first 24 characters (else `pi` / `claude`); left unnamed the
    launcher would call the tab `cmd`. `claude --version` is probed once per scan.
  - Icons are Herdr's `icons/pi.svg` (one colour: `svg()` in `t.muted`) and `icons/claude.svg` (own colour:
    `image()`), nudged down 2px.
  - State in `shared`: tags at `hs.sessions.tags` keyed `pi:<file name>`; the view at `hs.sessions.view` as
    `{ tree, folded }`. One `InputState` per tagging row, cached by key so re-renders never rebuild it.
  - Art: `sessions.svg`, `list.svg`, `tree.svg`, `chevron-down.svg`, `chevron-right.svg`.
- **hs-favorites** — a flat list from `shared("hs.favorites")`, entries `{ name, folder, machine }`.
  `spaceAt(fav)` finds the space on a favorite and drives both the click (`space.select`, else `space.new
  { folder, machine }`) and the badge. The star uses the space's own `folder`, the focused pane's cwd
  only if the space has none (always using it made switching spaces look like a no-op). The bottom row
  calls `pickFolder()` with no prompt. Art: `folder.svg`, `star.svg`, `plus.svg`.
- **paths.js** — one copy in each of hs-sessions and hs-favorites (a mod can only import from its own
  folder; `scripts/install.sh` refuses to run if they differ). Every folder comparison goes through it: `pathKey`
  (forward slashes, no trailing slash, lowercase on Windows and macOS), `isInside`, `samePath`, `baseName`,
  `tildify`. Folders are stored and launched as the OS spelled them.

`herdr` functions used: `spaces`, `panes`, `focused`, `layout`, `theme`, `window`, `shared` / `setShared`,
`run`, `exec`, `home`, `appHome`, `notify`, `pickFolder`, `checking`. Beyond the layout it relies on Herdr's own
`tabs`, `files` and `changes` mods and its `icons/`. Programs run: Python, `pi`, `claude`.

## Keeping hs-tabs on Herdr's tabs

Herdr updates its own mods on every release. A fork would silently sit on the old `tabs` forever, so the
fork is stored as **upstream + one patch** and rebuilt, never hand-edited in place. Three files keep it:

- `vendor/herdr/tabs/main.js` — Herdr's `tabs` mod byte for byte as it shipped. `SOURCE` beside it records
  the app version and the date it was taken — no path, so it names nobody's machine.
- `vendor/herdr/tabs/hs-tabs.patch` — the entire difference, four hunks: the `// @ts-nocheck` line,
  `enabled` gaining `sessions` / `favorites`, the label becoming a tooltip while the button is off, and
  the two `panelButton`s.
- `mods/hs-tabs/main.js` — the snapshot with that patch applied. It is generated: an edit made only
  there is not part of the fork until it is in the patch as well.

`scripts/tabs-sync.sh` has two commands:

```bash
bash scripts/tabs-sync.sh        # snapshot, installed upstream and hs-tabs: where they differ (exit 1 on drift)
bash scripts/tabs-sync.sh pull   # copy the installed tabs mod into vendor/ and record the version
```

After a Herdr release: `pull`. It prints whether the patch still applies. If it does, hs-tabs is
rebuilt from the new snapshot and the patch, deltas carried over. If a hunk no longer applies, `pull`
prints the deltas to port onto `vendor/herdr/tabs/main.js` — that copy is the new baseline — and hs-tabs
is rebuilt from there. Either way `herdr-app check mods/hs-tabs` is the gate, and `status` exits non-zero
while anything is out of step, so it can gate a release.

The snapshot is stored with LF endings and `pull` strips CR, because Herdr writes the platform's endings
and a Windows checkout of the snapshot would otherwise differ from a macOS one line for line.
`.gitattributes` pins that. The window-button icons `hs-tabs` reads stay Herdr's own at `mods/tabs/`:
not vendored, not patched.

## Watch out

- `cloned_from` is stripped from the layout and every `mod.json`. Left in, Herdr offers to update the mod
  from upstream and overwrites these changes.
- The panel starts hidden. People who miss the tab-bar buttons think the layout is broken.
- `hs-tabs` finds the layout nodes `sidebar`, `panel` and `panel-body` by id, and the panel buttons by the stack
  children `sessions` and `favorites`; keep those ids, they are the default's.
- When Herdr changes `main.json`, re-apply the three layout changes to the new version rather than
  editing this file; none of those details are repeated here. When it changes its `tabs` mod, take the
  update through `scripts/tabs-sync.sh` (above) instead of copying it over `hs-tabs`.
- Editing a mod's file does not reload the copy on screen. Select another panel and back
  (`layout.select --stack panel-body --child sessions`), or switch layouts and back.
- `shared.json` on disk is a snapshot; editing it changes nothing until a restart. Only `setShared`
  moves live state.
- Session records are read on this computer, so a remote space lists nothing.
- A missing Python, `pi` or `claude` must end in a message or toast, never a broken panel. Nothing runs
  during `herdr-app check` (`checking()` guards `init`).
- The copy is hard-coded and mixes Chinese with English; there is no i18n layer (the README lists the
  strings). Paths can be long: `max_w` and `truncate` throughout.

## Done when

- `herdr-app check` passes for the three mods, and `herdr-app do layout.switch --name sessions` shows the
  layout with nothing in `herdr-app status`'s `errors`.
- Each panel button opens its panel and collapses it on a second click, and a space reopens the panel it
  last had.
- Sessions lists only the current project; `#tag` narrows to tagged rows; a row opens a tab named after the
  session and resumes it in its folder.
- The list/tree toggle works, and the choice survives a restart.
- Favorites saves the space's project folder; a click switches to the space already on that folder, also
  when an agent runs there from a space whose own folder differs, instead of making a duplicate.
- `bash setup.sh uninstall` (`scripts/uninstall.sh`) removes the layout and the three mods and restores any install backup.
