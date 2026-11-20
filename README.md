# Herdr Sessions

A [Herdr](https://herdr.dev) layout for people who drive coding agents all day.

- Spaces & tabs on the left, terminal in the middle, one right-hand panel for **Sessions / Favorites**
- Resume any coding-agent session (pi / Claude Code) in one click, right in its original folder
- Tag your sessions, filter with `#tag`, and pin favorite folders for one-click switching

![Herdr Sessions](preview.png)

一个给 [Herdr](https://herdr.dev) 用的布局，给整天开着编程 agent 干活的人：

- 左边空间和标签，中间终端，右边一个面板装 **会话 / 收藏** 两件事
- 会话一条一点就恢复（pi / Claude Code 都收），就在它原来的目录里
- 会话可以打标签，搜 `#标签` 一秒过滤；常用目录加收藏，一点就切过去

---

## 中文

### 这是什么

| 区域 | 里面是什么 |
| --- | --- |
| 左侧栏 268px | 空间列表（可改颜色、重命名、新建）、Agent 列表、底部状态 |
| 顶部 42px | 打开的标签、两个面板开关、窗口按钮 |
| 中间 | 终端。标题栏和窗口按钮的位置都留好了，窄的时候也不会挤掉 |
| 右侧面板 368px | 两个面板叠在一起，点顶栏按钮切换；**默认收起** |
| 底部 28px | 状态栏 |

右侧两个面板：

- **Sessions** — 会话记录。**只列当前 space 所在项目的会话**，pi / Claude Code 两种都收，
  点一条就在它原来的目录里恢复那个会话。每条两行再加一行标签：标题、时间和路径、标签。
  搜索框里写 `#标签` 就只按标签过滤，`#数据 #对账` 要求两个标签都有，`#数据 跑` 是标签加关键词。
  行右侧的 `+` 加标签（逗号分隔），保存后显示成标签块，点标签块上的 ✕ 删掉。
- **Favorites** — 收藏的目录，一条一行，点一下切到那个目录（已经开着就直接切过去，没开就新建一个 space）。
  顶部「收藏当前目录」存的是当前 space 的项目目录，「浏览文件夹收藏…」可以挑任意文件夹。

### 安装

```bash
git clone https://github.com/<你的用户名>/herdr-sessions.git /tmp/herdr-sessions
bash /tmp/herdr-sessions/install.sh
```

脚本会备份同名文件、把 `layouts/sessions.json` 和 4 个 mod 拷进 `~/.config/herdr-app`、
逐个 `herdr-app check`，最后切到 `sessions` 布局。装完点顶栏右侧按钮打开面板。

手动安装也可以：把 `layouts/sessions.json` 拷到 `~/.config/herdr-app/layouts/`，
把 `mods/hs-*` 四个目录拷到 `~/.config/herdr-app/mods/`，然后
`herdr-app do layout.switch --name sessions`。

### 依赖

缺了只影响对应的功能：

| 程序 | 用来做什么 | 没有会怎样 |
| --- | --- | --- |
| `python3`（或 `python`） | 扫会话文件 | Sessions 列表空着 |
| `git` | Spaces 的分支显示 | 分支显示没内容 |
| `pi` | 会话标题、恢复 pi 会话 | 标题退回首条消息，不能恢复 pi 会话 |
| `claude` | 恢复 Claude Code 会话 | 不列/不能恢复 cc 会话 |

### 关于语言

界面文案是**中文写死的，布局本身无法中英切换**。要英文界面，只能自己改字符串，
主要在这几个文件里（都在 `mods/*/main.js`）：

- `mods/hs-tabs/main.js` — 顶栏两个按钮的 `Sessions` / `Favorites`
- `mods/hs-sessions/main.js` — `Sessions`、`搜索标题/路径， #标签 只按标签过滤`、`标签，逗号分隔`、`保存`
- `mods/hs-favorites/main.js` — `Favorites`、`收藏当前目录`、`浏览文件夹收藏…`、`还没有收藏`

改完存盘，切走再切回这个布局就会加载新文案（`herdr-app do layout.switch --name main` 再切回来）。

### 卸载

```bash
bash uninstall.sh
```

只删 `layouts/sessions.json` 和你装进来的 4 个 mod，安装时若有备份会还原。
你收藏的目录和标签留在 `shared.json` 的 `hs.favorites`、`hs.sessions.tags` 里，想清就自己删。

---

## English

### What it is

A layout for [Herdr](https://herdr.dev).

| Area | What's in it |
| --- | --- |
| Left sidebar, 268px | Spaces (rename, colour, new), agent list, status at the bottom |
| Top bar, 42px | Your tabs, the two panel buttons, the window buttons |
| Middle | The terminal. Title bar and window buttons have their spots reserved; nothing gets squeezed when narrow |
| Right panel, 368px | Two panels stacked, switch from the top bar; **collapsed by default** |
| Bottom, 28px | Status bar |

The two right-hand panels:

- **Sessions** — session history. It lists **only the sessions of the current space's project**,
  from pi and Claude Code, and clicking one resumes it in the folder it was recorded in.
  Each row is title / time and path / tags. In the search box, `#tag` filters by tag only,
  `#data #recon` requires both, `#data run` is a tag plus keywords. `+` on a row adds tags
  (comma separated); click ✕ on a tag to drop it.
- **Favorites** — saved folders, one per line. Click to switch to that folder: it selects the
  space already open there, or makes a new one. `收藏当前目录` saves the current space's project
  folder, `浏览文件夹收藏…` lets you pick any folder.

### Install

```bash
git clone https://github.com/<you>/herdr-sessions.git /tmp/herdr-sessions
bash /tmp/herdr-sessions/install.sh
```

The script backs up anything it would replace, copies `layouts/sessions.json` and the four mods into
`~/.config/herdr-app`, runs `herdr-app check` on each, and switches to the layout.

Or by hand: copy `layouts/sessions.json` to `~/.config/herdr-app/layouts/`, copy the four
`mods/hs-*` folders to `~/.config/herdr-app/mods/`, then
`herdr-app do layout.switch --name sessions`.

### Requirements

A missing program only disables its own feature.
`python3` (or `python`) scans sessions (without it the list stays empty), `git` provides the branch label in Spaces, `pi` provides session titles, and `claude`
is needed to resume Claude Code sessions.

### Language

**The interface copy is written in Chinese and the layout cannot switch languages.** For an English
UI you have to edit the strings yourself, mainly in `mods/*/main.js`: the two button labels in
`mods/hs-tabs/main.js`, the header, search placeholder and tag prompt in `mods/hs-sessions/main.js`,
and the labels in `mods/hs-favorites/main.js`.
Save, then switch away from the layout and back (`layout.switch --name main`, then back) to reload.

### Uninstall

```bash
bash uninstall.sh
```

It removes `layouts/sessions.json` and the four mods, restoring install-time backups if there were any.
Saved folders and tags stay in `shared.json` under `hs.favorites` and `hs.sessions.tags`.

---

## 发布到 herdr.dev / Publishing

推到 GitHub 后给仓库加 topic **`herdr-layout`**，一小时内会出现在
[herdr.dev/layouts](https://herdr.dev/layouts)。Add the topic `herdr-layout` to the repository and
it shows up there within the hour. `RECIPE.md` is the brief another agent builds this from.

## 友情链接
[LINUX DO](https://linux.do/) —— 真诚分享、友好讨论的技术社区，本项目的交流与反馈也发布于此