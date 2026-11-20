// Folder paths, the one place they are compared.
//
// Herdr and the agents report folders as the OS spells them: `/a/b` on macOS
// and Linux, `C:\a\b` or `C:/a/b` on Windows. Everything that compares or
// shortens a folder goes through here; launching and storing keep the
// original spelling untouched.
//
// This file is copied verbatim into every hs-* mod that needs it (a mod can
// only import from its own folder). install.sh refuses to run if the copies
// differ, so edit one and copy it over the others.
import { window, home } from "herdr";

// Windows and (by default) macOS file systems ignore case.
const caseless = () => ["windows", "macos"].includes(window()?.platform);

// Forward slashes, no trailing slash, except a root keeps its own
// (`/`, `C:/`), so a root stays a root.
function clean(path) {
  const s = String(path ?? "").trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (s === "") return path && String(path).trim() ? "/" : "";
  return /^[a-z]:$/i.test(s) ? `${s}/` : s;
}

// The comparable spelling of a folder: two paths name the same folder when
// their keys are equal.
export function pathKey(path) {
  const s = clean(path);
  return caseless() ? s.toLowerCase() : s;
}

export function samePath(a, b) {
  const k = pathKey(a);
  return k !== "" && k === pathKey(b);
}

// Is `child` the folder `root` or somewhere inside it? `/x-old` is not inside `/x`.
export function isInside(child, root) {
  const c = pathKey(child), r = pathKey(root);
  if (!c || !r) return false;
  return c === r || c.startsWith(r.endsWith("/") ? r : `${r}/`);
}

// The last segment: `/a/b/` -> `b`. A root names itself.
export function baseName(path) {
  const s = clean(path);
  return s.split("/").filter(Boolean).pop() ?? s;
}

// `~/rest` for folders under the home folder, the path as given otherwise.
export function tildify(path, homeDir = home()) {
  if (!path) return "";
  if (!homeDir || !isInside(path, homeDir)) return String(path);
  const rest = clean(path).slice(clean(homeDir).length).replace(/^\/+/, "");
  return rest ? `~/${rest}` : "~";
}
