// @ts-nocheck  (plain-JS herdr mod: no type annotations by design; herdr-app check is the gate)
// The top bar: the active space's tabs, the Sessions / Favorites panel
// toggles, and window buttons where the system draws none.
//
// The ids below are the layout's (layouts/sessions.json); renaming a node
// there means renaming it here.
import { View, div, svg, image } from "gpui-kit";
import { h_flex, ScrollHandle } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, layout, settings, shared, checking } from "herdr";

const SIDEBAR = "sidebar", PANEL = "panel", PANEL_BODY = "panel-body";
// Files and Changes are Herdr's own panels, shown as the default layout shows them
// (the person's `workspace.panels` setting decides which); Sessions and Favorites are ours.
const PANELS = [
  { id: "files", label: "Files", icon: "mods/files/file.svg", shipped: true },
  { id: "changes", label: "Changes", icon: "mods/changes/changes.svg", shipped: true },
  { id: "sessions", label: "Sessions", icon: "mods/hs-sessions/sessions.svg" },
  { id: "favorites", label: "Favorites", icon: "mods/hs-favorites/star.svg" },
];
const enabledPanels = () => {
  const chosen = shared("workspace.panels");
  const shipped = Array.isArray(chosen) ? chosen : ["files", "changes"];
  return PANELS.filter((p) => !p.shipped || shipped.includes(p.id));
};
const ICON = (name) => `mods/hs-tabs/${name}.svg`;
// Room for macOS's three window buttons right of their `traffic_lights` x, px at zoom 1.
const TRAFFIC_LIGHTS_WIDTH = 64;

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

function loadObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.scroll = ScrollHandle.new();
    this.panels = loadObject("panels");
    this.swipe = { acc: 0, steps: 0, at: 0, last: 0 };
  }

  // One tab per wheel notch. A touchpad or smooth-scrolling mouse sends many
  // small events per gesture: a short swipe switches one tab, a longer one a
  // tab per 60 px, at most one every 100 ms so each shows.
  wheel(e) {
    if (e.delta_lines) {
      if (e.delta_lines.y) run(e.delta_lines.y > 0 ? "tab.prev" : "tab.next");
      return;
    }
    const s = this.swipe, now = Date.now();
    // Phases often arrive only as moves (a macOS touchpad included): a pause
    // or a turn starts a new gesture.
    if (e.touch_phase === "started" || now - s.at > 250 || e.delta.y * s.acc < 0) Object.assign(s, { acc: 0, steps: 0 });
    s.at = now;
    s.acc += e.delta.y;
    const need = s.steps ? 60 : 20;
    if (Math.abs(s.acc) < need || now - s.last < 100) return;
    s.acc -= Math.sign(s.acc) * need;
    s.steps++;
    s.last = now;
    run(e.delta.y > 0 ? "tab.prev" : "tab.next");
  }

  showPanel(id) {
    run("layout.select", { stack: PANEL_BODY, child: id });
    run("layout.show", { id: PANEL });
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel || checking()) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.some((p) => p.id === stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) this.showPanel(want);
          else run("layout.hide", { id: PANEL });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  // macOS draws its window buttons over the bar: start the tabs after them.
  leftPadding(root) {
    const w = window();
    if (!(w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights)) return 10;
    const sidebar = find(root, SIDEBAR);
    const zoom = Number(settings().zoom) || 1;
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    return Math.max(10, (root.traffic_lights[0] + TRAFFIC_LIGHTS_WIDTH) / zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0));
  }

  windowButtons(el, button) {
    const w = window();
    if (!w?.buttons) return el;
    const win = w.platform === "windows";
    return el
      .child(button("minimize", win ? svg(ICON("win-min")).size(16) : "−", () => run("window.minimize")))
      .child(button("maximize", win ? svg(ICON(w.maximized ? "win-restore" : "win-max")).size(16) : "□", () => run("window.maximize")))
      .child(button("close-window", win ? svg(ICON("win-close")).size(16) : svg("mods/pane/close.svg").size(13), () => run("window.close")));
  }

  render() {
    const t = theme();
    const space = spaces().find((p) => p.active);
    const shown = space?.tabs ?? [];
    const active = shown.findIndex((tab) => tab.active);
    const selected = shown[active]?.id;
    if (selected !== this.selected || active !== this.selectedIndex) {
      this.selected = selected;
      this.selectedIndex = active;
      if (active >= 0) this.scroll.scroll_to_item(active);
    }
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).size(26).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.dim).hover((s) => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", stop).on_click(action).child(label);
    const item = (c, i) => {
      const program = panes().find((p) => p.tab === c.id && p.program?.agent)?.program ?? panes().find((p) => p.tab === c.id)?.program;
      // An unnamed tab's name is only its position: show what runs in it instead.
      const name = c.named ? c.name : program?.name ?? "Terminal";
      return h_flex().id(`tab-${c.id}`).h(29).px(10).gap(7).rounded(7).items_center().flex_none().text_size(12.8)
        // A rename or status dot on this or an earlier tab can push the active one out.
        .when(i <= active, (el) => el.on_size_change((_size, cx) => { this.scroll.scroll_to_item(active); cx.notify(); }))
        .border(1).border_color(c.active ? t.border : t.chrome).bg(c.active ? t.raised : t.chrome).text_color(c.active ? t.foreground : t.muted)
        .hover((s) => s.bg(t.hover))
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex((x) => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }); })
        .when(Boolean(program?.icon), (el) => el.child(program.tint ? svg(program.icon).size(14).text_color(t.muted) : image(program.icon).size(14)))
        .child(div().max_w(170).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.status === "working", (el) => el.child(svg("mods/workspace-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "blocked" || c.status === "done", (el) => el.child(div().size(6).rounded(3).bg(t[c.status])))
        .when(c.active, (el) => el.child(div().id(`close-${c.id}`).text_color(t.dim).on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }).child(svg("mods/pane/close.svg").size(12))));
    };
    const root = layout(), panel = find(root, PANEL), body = find(root, PANEL_BODY);
    const enabled = enabledPanels();
    this.syncPanel(space, panel, body, enabled);
    const panelButton = ({ id, label, icon }) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6)
        .text_size(12).bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover((s) => s.bg(t.hover)).on_mouse_down("left", stop)
        .on_click(() => (on ? run("layout.hide", { id: PANEL }) : this.showPanel(id)))
        .child(svg(icon).size(14)).child(label);
    };
    const bar = h_flex().size_full().min_w(0).px(10).pl(this.leftPadding(root)).gap(3).items_center().bg(t.chrome).border_b(1).border_color(t.border)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel((e) => this.wheel(e))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_center().gap(3).overflow_x_scrollbar().track_scroll(this.scroll)
        .on_size_change((_size, cx) => { if (active >= 0) { this.scroll.scroll_to_item(active); cx.notify(); } })
        .children(shown.map(item)))
      .child(button("tab-new", "+", () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 })))
      .children(enabled.map(panelButton));
    return this.windowButtons(bar, button);
  }
}
