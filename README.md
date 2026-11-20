# Herdr Sessions

A [Herdr](https://herdr.dev) layout for people who drive coding agents all day.

- Spaces & tabs on the left, terminal in the middle, one right-hand panel for **Sessions / Favorites**
- Resume any coding-agent session (pi / Claude Code) in one click, right in its original folder
- Tag your sessions, filter with `#tag`, and pin favorite folders for one-click switching

![Herdr Sessions](preview.png)

---

### 简介

一个给 [Herdr](https://herdr.dev) 用的布局，给整天开着编程 agent 干活的人：

右侧两个面板：

- **Sessions** — 会话记录。**只列当前 Space 所在项目的会话**，pi / Claude Code 两种都收，
  点一条就在它原来的目录里恢复那个会话，新开的 tab 以会话标题命名。焦点终端离开 Space 目录时，
  列表改跟随它所在的目录。每条两行再加一行标签：标题、时间和路径、标签，行首是 Pi / Claude Code 的图标。
  搜索栏右侧的按钮在列表和树状视图间切换；树状视图按 PI / Claude Code 分组、组名旁显示数量，视图和折叠状态会记住。
  搜索框里写 `#标签` 就只按标签过滤。
  行右侧的 `+` 加标签（逗号分隔），保存后显示成标签块，点标签块上的 ✕ 删掉。
- **Favorites** — 收藏的目录，一条一行，点一下切到那个目录（已经开着就直接切过去，没开就新建一个 Space；
  Space 的目录是它，或其中某个终端正停在它里面，都算开着）。
  顶部的星标按钮存的是当前 Space 的项目目录，底部「浏览文件夹…」可以挑任意文件夹。

### 安装

```bash
git clone https://github.com/<你的用户名>/herdr-sessions.git /tmp/herdr-sessions
bash /tmp/herdr-sessions/install.sh
```

脚本先对每个 mod 跑 `herdr-app check`，通过了才动你的目录；同名文件会移到
`~/.config/herdr-app/backups/<时间>/`（不放在 `mods/` 里，免得被当成 mod 加载），
再把 `layouts/sessions.json` 和 3 个 mod 拷进 `~/.config/herdr-app`，最后切到 `sessions` 布局。装完点顶栏右侧按钮打开面板。

手动安装也可以：把 `layouts/sessions.json` 拷到 `~/.config/herdr-app/layouts/`，
把 `mods/hs-*` 三个目录拷到 `~/.config/herdr-app/mods/`，然后
`herdr-app do layout.switch --name sessions`。

### 依赖

缺了只影响对应的功能：

| 程序 | 用来做什么 | 没有会怎样 |
| --- | --- | --- |
| Python 3（`python3`、`python` 或 `py -3`） | 扫会话文件 | Sessions 列表显示错误提示 |
| `pi` | 会话标题、恢复 pi 会话 | 标题退回首条消息，不能恢复 pi 会话 |
| `claude` | 恢复 Claude Code 会话 | 不列/不能恢复 cc 会话 |

### 关于语言

界面文案**写死了，不会随系统语言切换**，中英文混用。要统一成某种语言，只能自己改字符串，主要在这几个文件里（都在 `mods/*/main.js`）：

- `mods/hs-tabs/main.js` — 顶栏按钮的 `Sessions` / `Favorites`
- `mods/hs-sessions/main.js` — 标题 `Sessions`、搜索框占位符 `搜索标题/路径，或按 #标签 过滤`、标签输入框占位符 `标签，逗号分隔`、`保存`按钮、视图切换的悬浮提示、`Untitled`、相对时间（`刚刚` / `分钟前`…）、空列表提示、错误与通知文案
- `mods/hs-favorites/main.js` — 标题 `Favorites`、星标按钮的悬浮提示、`Browse folders…`、空列表提示、收藏相关的通知文案

改完存盘，切走再切回这个布局就会加载新文案（`herdr-app do layout.switch --name main` 再切回来）。

### 卸载

```bash
bash uninstall.sh
```

只删 `layouts/sessions.json` 和你装进来的 3 个 mod（带 `.herdr-sessions` 标记的才删，你自己放的同名目录不动），
安装时备份过的原文件会还原。
你收藏的目录、标签和视图设置留在 `shared.json` 的 `hs.favorites`、`hs.sessions.tags`、`hs.sessions.view` 里，想清就自己删。

---
