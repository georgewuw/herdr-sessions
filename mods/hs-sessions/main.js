// @ts-nocheck  (plain-JS herdr mod: no type annotations by design; herdr-app check is the gate)
// Session records for pi and Claude Code in this space's project: titled from
// each tool's own records, tagged by hand, resumed in a new tab with one click.
//
// scan.py (next to this file) finds and reads the records; this file only
// filters, tags and launches. Folder comparisons go through paths.js.
import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { spaces, panes, focused, exec, theme, home, appHome, run, shared, setShared, notify, window, checking } from "herdr";
import { isInside, tildify } from "./paths.js";

const TAGS = "hs.sessions.tags";
const VIEW = "hs.sessions.view"; // { tree: boolean, folded: agent[] }, kept across restarts
const SCANNER = "mods/hs-sessions/scan.py"; // relative to appHome(); mod.clone rewrites it
const RESCAN_MS = 30000;
const SCAN_TIMEOUT_MS = 60000;
const PROBE_TIMEOUT_MS = 15000;
const MAX_ROWS = 400;
const TAB_NAME_MAX = 24;

const PI = "pi", CC = "cc";
// `icon`: Herdr's own program icons (the ones the Agents list and tabs draw);
// `tint`: a one-color glyph painted in the theme color, else drawn as is.
const AGENTS = {
  [PI]: { program: "pi", label: "pi", icon: "icons/pi.svg", tint: true },
  [CC]: { program: "claude", label: "cc", icon: "icons/claude.svg", tint: false },
};

const ICON = (name) => `mods/hs-sessions/${name}.svg`;
const GROUPS = [{ agent: PI, name: "Pi" }, { agent: CC, name: "Claude Code" }];

const isWindows =() => window()?.platform === "windows";

// argv that starts a program found on PATH. On Windows npm-style launchers
// (`pi` is an extensionless shell shim, `pi.cmd` a batch file) can't be
// spawned directly, so every program goes through `cmd /c`.
const command = (program, ...args) => (isWindows() ? ["cmd", "/c", program, ...args] : [program, ...args]);
const execCommand = (argv, options) => exec(argv[0], argv.slice(1), options);

// Windows has a `python3` Store stub that exits without running anything; the
// `py` launcher is the official fallback there.
const PYTHONS = [["python3"], ["python"], ["py", "-3"]];

// "This project" is the space's own folder, unless the shown space's focused
// terminal has left it: then it is where that terminal is now, so an agent
// started elsewhere is still found. Inside the folder (a `cd` into a subfolder)
// the space's folder stays. A focused terminal that belongs to another space
// is ignored (switching spaces must change the list).
function activeSpace() {
  return spaces().find((s) => s.active) ?? null;
}
function projectRoot(space) {
  const f = focused();
  const mine = f && (!space || f.space === space.id);
  const pane = mine && f.pane ? panes().find((p) => p.pane === f.pane) : null;
  const cwd = (mine && (pane?.cwd || f.cwd)) || "";
  if (space?.folder && (!cwd || isInside(cwd, space.folder))) return space.folder;
  return cwd || space?.folder || "";
}

function when(millis) {
  const s = Math.max(0, Date.now() - millis) / 1000;
  if (s < 60) return "刚刚";
  if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
  return `${Math.floor(s / 86400)}天前`;
}

export default class Sessions extends View {
  init(_props, cx) {
    this.sessions = [];
    this.error = null;
    this.loading = false;
    this.loaded = false;
    this.python = undefined; // argv prefix of a working Python, null: none found
    this.claude = false;
    this.tagOnly = null; this.filter = ""; this.tagging = null;
    this.input = InputState.new({ placeholder: "搜索标题/路径， #标签 只按标签过滤" });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); cx.notify(); });
    if (checking()) return;
    // The scan is independent of the shown space (render filters it), so it
    // only runs on a timer; switching spaces re-renders on its own.
    this.refresh(cx);
    cx.timer.every(RESCAN_MS, (cx) => this.refresh(cx));
  }

  async findPython() {
    if (this.python !== undefined) return this.python;
    for (const argv of PYTHONS) {
      try {
        const r = await execCommand([...argv, "-c", "print(1)"], { timeout: PROBE_TIMEOUT_MS });
        if (r.code === 0 && r.stdout.trim() === "1") return (this.python = argv);
      } catch { /* not installed */ }
    }
    return (this.python = null);
  }

  async hasClaude() {
    try {
      const r = await execCommand(command(AGENTS[CC].program, "--version"), { timeout: PROBE_TIMEOUT_MS });
      return r.code === 0;
    } catch { return false; }
  }

  async scan() {
    const python = await this.findPython();
    if (!python) throw new Error("找不到 Python（python3 / python / py），无法读取会话");
    const r = await execCommand([...python, `${appHome()}/${SCANNER}`, home()], { timeout: SCAN_TIMEOUT_MS });
    if (r.code !== 0) throw new Error(`扫描会话失败：${(r.stderr || r.stdout).trim().split("\n").pop() || `exit ${r.code}`}`);
    return JSON.parse(r.stdout).sessions ?? [];
  }

  // A failed scan keeps the list it had and says why, instead of looking empty.
  refresh(cx) {
    if (this.loading) return;
    this.loading = true;
    cx.spawn(async (cx) => {
      try {
        const [found, claude] = await Promise.all([this.scan(), this.hasClaude()]);
        this.claude = claude;
        this.sessions = found.filter((s) => s.title || s.cwd).sort((a, b) => b.mtime - a.mtime).slice(0, MAX_ROWS);
        this.error = null;
      } catch (e) {
        this.error = String(e?.message ?? e);
      } finally {
        this.loading = false;
        this.loaded = true;
        cx.notify();
      }
    });
  }

  // Tags are keyed on the session's file name: stable, and what tags stored
  // by earlier versions use. `id` is only for resuming.
  keyOf(session) {
    return `${session.agent}:${session.file || session.id}`;
  }

  tagsOf(session) {
    const all = shared(TAGS) ?? {};
    return all[this.keyOf(session)] ?? all[`${session.agent}:${session.id}`] ?? [];
  }

  setTags(session, tags, cx) {
    const all = { ...(shared(TAGS) ?? {}) }, key = this.keyOf(session);
    if (tags.length) all[key] = tags; else delete all[key];
    setShared(TAGS, all);
    cx.notify();
  }

  visible(root) {
    // `#tag` filters by tag only, `#tag word` requires both, several `#tags`
    // must all match. A tag matches on substring, so `#数据` finds 数据对账.
    const raw = this.filter.trim();
    const wanted = [...raw.matchAll(/#([^\s#]+)/g)].map((m) => m[1].toLowerCase());
    const q = raw.replace(/#[^\s#]+/g, " ").trim().toLowerCase();
    return this.sessions.filter((s) => {
      if (!(root && s.cwd && isInside(s.cwd, root))) return false;
      const own = this.tagsOf(s).map((x) => String(x).toLowerCase());
      if (this.tagOnly && !own.includes(String(this.tagOnly).toLowerCase())) return false;
      if (wanted.some((tag) => !own.some((x) => x.includes(tag)))) return false;
      if (!q) return true;
      return `${s.title} ${own.join(" ")} ${s.cwd}`.toLowerCase().includes(q);
    });
  }

  // Opens the session in the folder it was recorded in (in the agent's own
  // spelling of it); the agent's CLI must be on the PATH.
  resume(session) {
    if (session.agent === CC && !this.claude) { notify({ title: "claude 未安装", body: "找不到 claude 命令，无法 resume 这个会话", level: "warning" }); return; }
    if (!session.cwd) { notify({ title: "会话没有记录目录", level: "warning" }); return; }
    const flag = session.agent === PI ? "--session" : "--resume";
    // A tab named after the session: left to itself it would take the launcher's
    // name (`cmd` on Windows).
    const title = [...(session.title || "")].slice(0, TAB_NAME_MAX).join("").trim();
    run("tab.new", { name: title || AGENTS[session.agent].program, argv: command(AGENTS[session.agent].program, flag, session.id), folder: session.cwd });
  }

  tagInputFor(key) {
    // One InputState per tagging session, kept so re-renders never rebuild it.
    if (this.tagKey !== key) {
      this.tagKey = key;
      this.tagInput = InputState.new({ placeholder: "标签，逗号分隔" });
      this.tagInput.on("submit", (_e, cx) => this.commitTag(cx));
    }
    return this.tagInput;
  }

  startTag(session, cx) {
    const key = this.keyOf(session);
    this.tagging = key;
    this.tagInputFor(key);
    cx.notify();
  }

  commitTag(cx) {
    const session = this.sessions.find((s) => this.keyOf(s) === this.tagging);
    const typed = (this.tagInput?.value() ?? "").split(/[,，]/).map((t) => t.trim()).filter(Boolean);
    if (session && typed.length) this.setTags(session, [...new Set([...this.tagsOf(session), ...typed])], cx);
    this.tagging = null;
    this.tagInput = null;
    this.tagKey = null;
    cx.notify();
  }

  tagChip(session, tag, j, i, t) {
    const on = this.tagOnly === tag;
    return h_flex().id(`tag-${i}-${j}`).h(16).px(5).gap(3).flex_none().items_center().rounded(4)
      .bg(on ? t.selected : t.raised).text_size(10).text_color(on ? t.foreground : t.muted).cursor_pointer()
      .hover((s) => s.bg(t.hover))
      .on_click((_e, cx) => { cx.stop_propagation(); this.tagOnly = on ? null : tag; cx.notify(); })
      .child(div().max_w(90).truncate().child(tag))
      .child(div().id(`tag-x-${i}-${j}`).text_size(10).text_color(t.dim).hover((s) => s.text_color(t.ansi1))
        .on_click((_e, cx) => { cx.stop_propagation(); if (this.tagOnly === tag) this.tagOnly = null; this.setTags(session, this.tagsOf(session).filter((x) => x !== tag), cx); })
        .child("✕"));
  }

  // Three lines: the title, then time + folder, then this session's tags.
  row(session, i, t) {
    const tags = this.tagsOf(session), agent = AGENTS[session.agent];
    const tagging = this.tagging === this.keyOf(session);
    return div().id(`session-${i}`).flex().flex_col().flex_none().w_full().min_w(0).gap(3).px(8).py(6).rounded(7)
      .when(!tagging, (el) => el.cursor_pointer().hover((s) => s.bg(t.hover)).on_click(() => this.resume(session)))
      .when(tagging, (el) => el.bg(t.selected))
      .child(h_flex().w_full().min_w(0).gap(7).items_center()
        .child(this.agentIcon(agent, t).id(`agent-${i}`))
        .child(div().flex_1().min_w(0).truncate().text_size(12.5).text_color(t.foreground).child(session.title || "(无标题)"))
        .when(!tagging, (el) => el.child(div().id(`tag-add-${i}`).size(15).flex_none().flex().items_center().justify_center().rounded(4).text_size(11).text_color(t.dim)
          .hover((s) => s.text_color(t.accent).bg(t.raised))
          .on_click((_e, cx) => { cx.stop_propagation(); this.startTag(session, cx); })
          .child("+"))))
      .child(h_flex().w_full().min_w(0).pl(29).gap(6).items_center()
        .child(div().flex_none().text_size(10.5).text_color(t.dim).child(when(session.mtime)))
        .child(div().flex_none().text_size(10.5).text_color(t.dim).child("·"))
        .child(div().flex_1().min_w(0).truncate().text_size(10.5).child(tildify(session.cwd) || "未记录目录")))
      .when(tagging, (el) => el.child(h_flex().w_full().min_w(0).pl(29).gap(4).items_center()
        .child(Input.new(this.tagInputFor(this.keyOf(session))).flex_1().min_w(0).h(22).text_size(11).text_color(t.foreground))
        .child(div().id("tag-save").h(22).px(6).flex_none().flex().items_center().rounded(5).bg(t.raised).cursor_pointer().text_size(10.5).text_color(t.accent)
          .hover((s) => s.bg(t.hover)).on_click((_e, cx) => { cx.stop_propagation(); this.commitTag(cx); }).child("保存"))))
      .when(!tagging && tags.length, (el) => el.child(h_flex().w_full().min_w(0).pl(29).gap(4).items_center().overflow_hidden()
        .children(tags.slice(0, 6).map((tag, j) => this.tagChip(session, tag, j, i, t)))
        .when(tags.length > 6, (el) => el.child(div().flex_none().text_size(10).text_color(t.dim).child(`+${tags.length - 6}`)))));
  }

  // The view (flat list or grouped by agent) and which groups are folded.
  view() {
    const v = shared(VIEW);
    return { tree: Boolean(v?.tree), folded: Array.isArray(v?.folded) ? v.folded : [] };
  }

  setView(patch, cx) {
    setShared(VIEW, { ...this.view(), ...patch });
    cx.notify();
  }

  // Tree view: one header per agent with its count, sessions under it. A group
  // with no sessions is left out; row ids stay unique across groups.
  groupRows(list, t) {
    const out = [];
    const { folded } = this.view();
    let n = 0;
    for (const { agent, name } of GROUPS) {
      const own = list.filter((s) => s.agent === agent);
      if (!own.length) continue;
      const open = !folded.includes(agent);
      out.push(h_flex().id(`group-${agent}`).h(28).flex_none().w_full().px(6).gap(6).items_center().rounded(6).cursor_pointer()
        .hover((s) => s.bg(t.hover))
        .on_click((_e, cx) => this.setView({ folded: open ? [...folded, agent] : folded.filter((a) => a !== agent) }, cx))
        .child(svg(ICON(open ? "chevron-down" : "chevron-right")).size(12).flex_none().text_color(t.dim))
        .child(div().text_size(12).font_semibold().text_color(t.foreground).child(name))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(`${own.length}`)));
      if (open) for (const s of own) out.push(this.row(s, n++, t));
    }
    return out;
  }

  // Herdr's own icon for an agent (see AGENTS).
  agentIcon(agent, t) {
    return div().w(22).h(18).flex_none().flex().items_center().justify_center()
      .child(agent.tint ? svg(agent.icon).size(14).text_color(t.muted) : image(agent.icon).size(14));
  }

  emptyText(root, remote) {
    if (this.error) return this.error;
    if (!this.loaded) return "Loading sessions…";
    if (remote) return "这个 space 在其他机器上：会话列表只读本机记录";
    if (!root) return "当前 space 没有目录";
    if (this.filter.trim().startsWith("#")) return "没有匹配这个标签的会话（先用行右侧 + 给会话加标签）";
    return "当前项目没有会话";
  }

  // Only the space's own project is listed, so no scope toggle: the header
  // shows which folder is being filtered instead.
  render(cx) {
    const t = theme(), space = activeSpace(), root = projectRoot(space);
    // Session records are read on this computer; a remote space's folders name another file system.
    const remote = Boolean(space?.machine);
    const list = remote ? [] : this.visible(root);
    const tree = this.view().tree;
    const rows = tree ? this.groupRows(list, t) : list.map((s, i) => this.row(s, i, t));
    return v_flex().id("sessions").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Sessions"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(`${list.length}`))
        .child(div().flex_1())
        .when(Boolean(this.tagOnly), (el) => el.child(h_flex().id("sess-tagonly").h(20).px(6).gap(4).flex_none().items_center().rounded(5).bg(t.raised).text_size(10.5).text_color(t.accent)
          .child(div().max_w(80).truncate().child(`#${this.tagOnly}`))
          .child(div().id("sess-tagonly-x").text_size(10).text_color(t.dim).hover((s) => s.text_color(t.ansi1))
            .on_click((_e, cx) => { this.tagOnly = null; cx.notify(); }).child("✕")))))
      .child(h_flex().h(30).flex_none().px(10).gap(8).items_center().border_b(1).border_color(t.border)
        .child(Input.new(this.input).flex_1().h_full().text_size(12).text_color(t.foreground))
        // One button for both views; it shows the view a click switches to.
        .child(div().id("sess-view").size(22).flex_none().flex().items_center().justify_center().rounded(5).cursor_pointer()
          .tooltip(tree ? "View as List" : "View as Tree")
          .hover((s) => s.bg(t.hover))
          .on_click((_e, cx) => this.setView({ tree: !tree }, cx))
          .child(svg(ICON(tree ? "list" : "tree")).size(14).flex_none().text_color(t.muted))))
      .when(Boolean(this.error && list.length), (el) => el.child(div().px(14).py(4).flex_none().text_size(10.5).text_color(t.blocked).truncate().child(this.error)))
      .child(v_flex().id("session-list").flex_1().min_h(0).p(6).gap(2).overflow_y_scroll()
        .children(rows))
      .when(!list.length, (el) => el.child(div().p(8).text_size(12).text_color(t.dim).child(this.emptyText(root, remote))));
  }
}
