// @ts-nocheck  (plain-JS herdr mod: no type annotations by design; herdr-app check is the gate)
// Favorites: remembered folders as a flat two-line list, kept in shared state.
// Opening one selects the space already on that folder (or makes a new one).
// "收藏当前目录" uses the space's own folder, not the focused terminal's cwd.
// Folders are stored as given and compared through paths.js.
import { View, div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, spaces, panes, focused, run, shared, setShared, pickFolder, notify } from "herdr";
import { samePath, baseName, tildify } from "./paths.js";

const KEY = "hs.favorites";
const ICON = (name) => `mods/hs-favorites/${name}.svg`;

const read = () => (Array.isArray(shared(KEY)) ? shared(KEY) : []);
// The same folder on the same machine (null: this computer).
const same = (a, b) => (a?.machine ?? null) === (b?.machine ?? null) && samePath(a?.folder, b?.folder);

// The folder this panel offers to keep: the space's own, else the focused terminal's.
function current() {
  const space = spaces().find((s) => s.active), f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  return { folder: space?.folder || pane?.cwd || f?.cwd || "", machine: space?.machine ?? null };
}

// The space "on" a favorite: its own folder matches, or one of its terminals is
// running there now (a space's folder can be empty or elsewhere while its agent
// sits in the favorite). The space's own folder wins over a terminal's cwd.
function spaceAt(fav) {
  const all = spaces().filter((s) => (s.machine ?? null) === (fav.machine ?? null));
  const own = all.find((s) => samePath(s.folder, fav.folder));
  if (own) return own;
  const cwds = new Map();
  for (const p of panes()) if (p.cwd) (cwds.get(p.tab) ?? cwds.set(p.tab, []).get(p.tab)).push(p.cwd);
  return all.find((s) => s.tabs.some((tab) => (cwds.get(tab.id) ?? []).some((cwd) => samePath(cwd, fav.folder))));
}

export default class Favorites extends View {
  open(fav) {
    const hit = spaceAt(fav);
    if (hit) run("space.select", { id: hit.id });
    else run("space.new", { folder: fav.folder, machine: fav.machine ?? "" });
  }

  keep({ folder, machine }) {
    if (!folder) { notify({ title: "当前没有可收藏的目录", level: "warning" }); return false; }
    const list = read();
    if (list.some((f) => same(f, { folder, machine }))) { notify({ title: "已收藏过", body: folder, level: "info" }); return false; }
    setShared(KEY, [...list, { name: baseName(folder) || folder, folder, machine: machine ?? null }]);
    notify({ title: "已收藏", body: folder, level: "success" });
    return true;
  }

  async browse() {
    // The system picker only browses this computer.
    const folder = await pickFolder();
    if (!folder) return;
    this.keep({ folder, machine: null });
    this.open({ folder, machine: null });
  }

  drop(fav, cx) {
    setShared(KEY, read().filter((x) => !same(x, fav)));
    cx.notify();
  }

  row(fav, i, t) {
    const open = !!spaceAt(fav);
    return h_flex().id(`fav-${i}`).h(42).flex_none().px(8).gap(8).items_center().rounded(7).cursor_pointer().hover((s) => s.bg(t.hover))
      .on_click(() => this.open(fav))
      .child(div().size(22).flex_none().flex().items_center().justify_center().rounded(5).bg(t.raised)
        .child(svg(ICON("folder")).size(13).flex_none().text_color(t.muted)))
      .child(div().flex().flex_col().flex_1().min_w(0).gap(1)
        .child(div().w_full().truncate().text_size(12.5).text_color(t.foreground).child(fav.name))
        // `~` is this computer's home: a remote folder is shown in full.
        .child(div().w_full().truncate().text_size(10.5).text_color(t.dim).child(`${fav.machine ?? "Local"} ·${fav.machine ? fav.folder : tildify(fav.folder)}`)))
      .when(open, (el) => el.child(div().flex_none().px(4).py(1).rounded(3).bg(t.raised).text_size(9.5).text_color(t.ansi2).child("Opened")))
      .child(div().id(`fav-x-${i}`).size(18).flex_none().flex().items_center().justify_center().rounded(4).text_size(11).text_color(t.dim)
        .hover((s) => s.text_color(t.ansi1))
        .on_click((_e, cx) => { cx.stop_propagation(); this.drop(fav, cx); })
        .child("✕"));
  }

  render() {
    const t = theme();
    const list = [...read()].sort((a, b) => String(a.folder).localeCompare(String(b.folder)));
    const rows = list.map((f, i) => this.row(f, i, t));
    return v_flex().id("favorites").size_full().min_h(0).rounded(10).overflow_hidden().bg(t.background).border_1().border_color(t.border).text_color(t.foreground).text_size(13)
      .child(h_flex().h(42).flex_none().px(14).gap(8).items_center().border_b(1).border_color(t.border)
        .child(div().font_semibold().child("Favorites"))
        .child(div().px(5).py(1).rounded(4).border_1().border_color(t.border).text_size(10).text_color(t.muted).child(`${list.length}`))
        .child(div().flex_1())
        .child(h_flex().id("fav-add").h(24).px(8).flex_none().gap(4).items_center().rounded(6).cursor_pointer().text_size(11.5).text_color(t.muted)
          .hover((s) => s.bg(t.hover).text_color(t.foreground))
          .on_click(() => this.keep(current()))
          .child(svg(ICON("star")).size(11).flex_none())
          .child(div().child("收藏当前目录"))))
      .child(v_flex().id("fav-list").flex_1().min_h(0).p(6).gap(2).overflow_y_scroll().children(rows)
        .when(!rows.length, (el) => el.child(div().p(8).text_size(12).text_color(t.dim).child("还没有收藏"))))
      .child(h_flex().id("fav-browse").h(30).flex_none().mx(6).mb(6).px(8).gap(7).items_center().rounded(7).cursor_pointer().text_size(12).hover((s) => s.bg(t.hover))
        .on_click(() => this.browse())
        .child(svg(ICON("plus")).size(13).flex_none().text_color(t.muted))
        .child(div().flex_1().min_w(0).text_color(t.muted).child("浏览文件夹…")));
  }
}
