<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo-dark.svg">
    <img src="docs/images/logo.svg" alt="DS Bot" width="260">
  </picture>
</p>

# DS Bot

English | [中文](README.zh.md)

![version](https://img.shields.io/badge/version-v0.2_preview-blue) ![DSH](https://img.shields.io/badge/DSH-0.2.1--rc.4-4D6BFE) ![license](https://img.shields.io/badge/license-Apache_2.0-green)

DS Bot is a bot plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH). It turns DSH into bots. You create your own bots, then talk and work with them.

This repository is the [994-eng/DS-Bot](https://github.com/994-eng/DS-Bot) fork of [Fei2411/DS-Bot](https://github.com/Fei2411/DS-Bot). It keeps that project's Apache 2.0 license, copyright and disclaimer: DS Bot is not an official DeepSeek product. The fork's own aim is a desktop client closer to Grok Bot and Groupbot. Four extensions carry that, and none of them patch DeepSeek Harness:

- **Linux desktop.** Agents drive a graphical session through [Cua spacesd](https://cua.ai/docs/cua-sdk/guides/spacesd) (gRPC on port 3211): screenshots, mouse, keyboard, windows, accessibility. See [`extensions/linux-desktop/`](extensions/linux-desktop/).
- **Agent browser.** [ego(lite)](https://github.com/citrolabs/ego-lite) gives each Bot a Task Space in one Chromium. DevTools and a redacted network log go through CDP. Playwright remains the fallback and the desktop app's existing browser bridge. See [`extensions/windows-browser/`](extensions/windows-browser/).
- **Virtual screens.** The right-hand column can show the selected Bot's screen. One machine and one shared data directory; the screens stay separate.
- **Cloud desktop.** A Linux GUI you run on a server, viewed in the Cua viewer or over noVNC, driven by the same spacesd. See [`extensions/cloud-desktop/`](extensions/cloud-desktop/).

The layout is described in [docs/architecture.md](docs/architecture.md). The model is told which capability to call in [docs/harness-identity-prompt.md](docs/harness-identity-prompt.md). A GUI task starts on the visual desktop: CUA screenshot, act, CUA screenshot again. Browser work is the EGO capability. Nothing in the plugin remaps one tool call into the other.

Skills for that loop live in [`skills/`](skills/). DeepSeek Harness loads a `SKILL.md` folder from `$DSH_HOME/skills` (the desktop app’s own data folder). Copy them on the server:

```sh
mkdir -p "$DSH_HOME/skills"
cp -a skills/computer-use-desktop skills/ego-browser skills/desktop-browser-control "$DSH_HOME/skills/"
```

[`vendor/lightvela-computer-use/`](vendor/lightvela-computer-use/) is a reference copy of the LightVela/Hermes computer-use modules. DS-Bot does not run Hermes.

## Windows client

The Windows app does not ask you to log in, register, or enter an email. Install `DeepSeek-Bot-<version>-win-x64.exe` and open it. The window opens the server’s DeepSeek Harness at `http://38.76.188.71:3080`, and the desktop is already on the right. There is no API key in git. A package built with the `MIMO_API_KEY` secret carries that key inside the installer.

| | |
|---|---|
| DSH web (chat, model menu) | `http://38.76.188.71:3080` |
| Computer (Cua spacesd) | `http://38.76.188.71:3211` |
| Screen | `http://38.76.188.71:8890/desktop` |

**Screen** is on the right as soon as the window opens. It loads the desktop page above, follows that page’s ticket redirect onto Cua, and can be zoomed. Click the picture to type and to use the pointer. The viewer refuses to be framed, so the panel is an Electron view, not an iframe. Browser work uses the EGO capability. The desktop uses CUA (spacesd). The identity prompt in `docs/harness-identity-prompt.md` is what the plugin tells the model. The skills in `skills/` ship inside the app.

If the page says `dsh web authentication required`, the server printed a connection URL when `dsh web` started. On the Windows machine set `DS_BOT_SERVER` to that full URL and start the app again. Do not commit the URL.

`DS_BOT_SERVER=local` keeps the app on its own Host. That is what the package check uses.

## MiMo

The model route is MiMo, OpenAI-compatible, at `https://mimo.ezlook.top/v1`. Provider id `mimo`.

| Model | Role |
|---|---|
| `mimo-v2.6-flash` | Default |
| `mimo-v2.6-pro` | In the model menu |

The route is registered under the credential name `MIMO_API_KEY`. There is no provider form. The key is not in git. The Windows package step reads the GitHub Actions secret `MIMO_API_KEY` and, when it is set, puts it in the installer. Set that secret on the repository before building if the packaged app should call MiMo itself. The server at `:3080` can hold the same variable for the page the window opens. An empty secret still builds; the route is present and the key is absent.

A Windows rebuild is required before an installed copy picks this up. GitHub Actions uploads `DeepSeek-Bot-win-x64` from the **Desktop app package (Windows)** job. To build on a Windows machine:

```powershell
.\scripts\build-windows-client.ps1
```

The installer is `app\dist-pack\DeepSeek-Bot-<version>-win-x64.exe`. CI does not connect to `38.76.188.71`, so the live desktop is not part of the automated check.

![Say one sentence to Chief, and it sets up the bots and the group chat](docs/images/team.png)

## Install

**Desktop app (Windows, macOS, Linux)**

The desktop app brings its own DSH, so you don't need to install DSH first. Download it from [Releases](https://github.com/Fei2411/DS-Bot/releases):

- Windows (x64): `DeepSeek-Bot-<version>-win-x64.exe`. Run it; it installs for your user only, without administrator rights. If Windows shows "Windows protected your PC", select **More info** → **Run anyway**.
- macOS: `DeepSeek-Bot-<version>-mac-arm64.zip` for an Apple chip, `DeepSeek-Bot-<version>-mac-x64.zip` for Intel. Safari unzips it by itself; drag **DeepSeek Bot** into **Applications** and open it. When macOS says it cannot check the app, open **System Settings** → **Privacy & Security** and select **Open Anyway**.
- Linux (x64): `DeepSeek-Bot-<version>-linux-x86_64.AppImage` runs on every distribution — make it executable and open it. It mounts through FUSE 2, which you may need to install first (`sudo apt install libfuse2t64` on Ubuntu 24.04+, `sudo dnf install fuse-libs` on Fedora, `sudo pacman -S fuse2` on Arch). On Ubuntu 24.04 and later an AppImage can refuse to start (Ubuntu restricts the sandbox it needs); the `DeepSeek-Bot-<version>-linux-amd64.deb` on Debian/Ubuntu does not have this problem and adds a menu entry.

At the first start the app asks where to keep its data and the Bots' files, and offers to copy a Bot team from your DSH (it only reads your DSH). Set up a model in its settings. The Windows app and the Linux AppImage update themselves; the macOS app and the Linux deb tell you when a new version is ready to download.

**Desktop app from source (Windows)**

With Node.js 22.19 or later and npm installed, run `.\start.ps1` in PowerShell from this checkout. It prepares and launches the current source, keeping your Bots, chats and model settings in `.ds-bot-local/` between runs. See [source startup](app/README.md#run-from-source-windows).

**As a plugin in DSH**

First install DSH and set up at least one model in it. DS Bot uses the models from DSH.

**DSH Desktop (Windows, macOS)**

1. In the sidebar, select **Plugins** → **Add plugin**.
2. In **Package name or address**, enter `ds-bot`. In mainland China, set **Registry** to **Mainland China mirror**.
3. Select **Install**, then **Enable now**. If DSH says the change takes effect at the next start, quit DSH completely and open it again.

If npm is not reachable, in step 2 you can also enter the full path of `ds-bot-0.2.1.tgz` downloaded from [Releases](https://github.com/Fei2411/DS-Bot/releases), or `github:Fei2411/DS-Bot#v0.2.1&path:/ds-bot` (needs Git).

DS Bot 0.2.1 and earlier cannot update themselves in DSH Desktop 0.2.1-rc.2 or later: on the Plugins page, remove `ds-bot` and add `ds-bot` again. The Bots, chats and memory stay.

**DSH Web (Windows, macOS, Linux)**

Needs Node.js `22.19` or later, and pnpm.

```sh
npx @deepseek-ai/dsh@0.2.1-rc.4 plugin --profile web add ds-bot
npx @deepseek-ai/dsh@0.2.1-rc.4 web
```

**Docker (NAS, Linux server)**

The [`docker/`](docker/) directory builds an image with DSH Web and DS Bot, for a NAS or any always-on machine. CI is configured to publish a prebuilt linux/amd64 image to GHCR. The container is the Bots' sandbox: they get full access to what you mount into it, and nothing else. See [`docker/README.md`](docker/README.md).

## Setup

I strongly recommend that you set up your other bots and group chats by just talking to a bot.

### Web search

DS Bot selects its `auto` search provider for the whole profile. If you disable `web-search-auto`, also select another registered search provider in that profile. See [Web search](ds-bot/README.md#web-search) and the [recovery steps](docs/known-issues.md#web-search-fails-everywhere-after-turning-off-web-search-auto).

## Features

### Bot

You can do all your talking and work with one bot, in one window. You don't need to worry about the context behind it. The bot's details page shows its info, and there you can pick the model you want it to use. You can switch models at any time, but I still recommend that you keep one model for a bot for a long time, and switch only when you really need to.

Bots also have memory. A bot remembers what you like and uses it in later work. You can manage its memory on the bot's details page, or just tell the bot.

![Bot details: model, memory, usage](docs/images/details.png)

### Main bot

The main bot is your chief. It has very high rights: it manages the other bots and the group chats. The first time you open DS Bot, there is already a main bot called Chief. Talk to it, and it walks you through the setup.

In short: have a question? Ask the main bot.

### Group chats

DS Bot has group chats. A group chat is a great way to get several bots to work together, but it clearly costs more. So DS Bot does this: every group chat has an admin. The admin answers your messages by default and calls in the other bots for you. You can also @ a bot directly, and it answers you directly: type @ and pick the bot from the list. To give the bots another chat as context, use + → Reference a chat in the message box.

Any bot can hand work to another bot with @. That bot does the work on its own, and the group goes on. While it works, it keeps the group posted, and the group, the sidebar and its own chat show what it is doing. When it is done, it posts the result in the group, and the bot that asked for the work answers. To stop the work, open the group's details.

A group chat has its own memory. What you tell the group stays in the group: its members use it there, and your other chats and the bots outside the group do not see it. You can manage it in the group's details.

![Group chat: the admin, Chief, hands the work to Writer and Coder](docs/images/group.png)

### Capabilities

Settings → **Capabilities** is a shared library of MCP servers, skills and packs. Add a capability to a Bot in its settings; it is available from that Bot's next message in its own chat and group chats. A local MCP command that a Bot adds needs your approval before it can run. While other Bots use a capability, only you or a Main Bot can change or delete it.

### Usage

In **Settings** → **Usage**, you can see token usage by time, by bot and by model.

![Usage page](docs/images/usage.png)

### Office files

Bots work with Office documents. They can create and edit .docx, .pptx and .xlsx, read a document's structure with stable ids, check a package for the defects Office would refuse, make targeted edits (comments, tracked changes, fields, table cells), reorder or duplicate slides, list workbook errors, and review rendered pages on a contact sheet. The desktop app includes everything needed; in DSH Desktop Bots use DSH's Office runtime plus DS Bot's commands; in DSH Web the inspect, check and edit commands work, while creating files from scratch and rendering pages need the desktop app or DSH Desktop.

## Data

All data stays on your own computer, in `bot/` and `sessions/` in the DSH home folder (`~/.dsh` by default). Uninstalling the plugin does not delete this data.

## Development

The plugin source is in [`ds-bot/`](ds-bot/). For options and internals, see [`ds-bot/README.md`](ds-bot/README.md). For development, tests and how the team works, see [CONTRIBUTING.md](CONTRIBUTING.md). For changes between versions, see [CHANGELOG.md](CHANGELOG.md).

## Acknowledgments

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness): DS Bot is built on the DSH plugin system. Every bot works in DSH sessions and uses the DSH tools and models.
- [esbuild](https://esbuild.github.io/): bundles the plugin's interface code.
- Thanks to these projects for the ideas they published. DS Bot learned from their designs and does not contain their code:
  - [AgentMemoryRepo](https://github.com/AgentMemoryRepo/agentmemoryrepo): the Markdown format of Bot memory.
  - [OpenAI Codex](https://github.com/openai/codex): checkpoints that keep the user's messages next to the summary, and message anchors for chat search.
  - [OpenMausBot](https://github.com/milind-soni/OpenMausBot): group chat rounds and @mention relays.
  - [Hermes Agent](https://github.com/NousResearch/hermes-agent) and [Hermes Bot Mode](https://github.com/NousResearch/Hermes-Bot-Mode): one session per member per group chat, and handoffs that carry the earlier user messages.
  - [OpenCode](https://github.com/sst/opencode), [goose](https://github.com/block/goose), [pi](https://github.com/badlogic/pi-mono) and [Gemini CLI](https://github.com/google-gemini/gemini-cli): when to condense a long chat, and what a handoff note holds.
  - [obelisk](https://github.com/tommy0103/obelisk): chat search with a SQLite full-text index.
- Everyone who tries DS Bot, asks questions and reports bugs.

## License

[Apache License 2.0](LICENSE). Provided "as is", without any warranty. Third-party code and its license are listed in [NOTICE](NOTICE).

## Disclaimer

DS Bot is an independent community project. **It is not an official DeepSeek product**, and it is not affiliated with, endorsed by or sponsored by DeepSeek. "DeepSeek", "DeepSeek Harness" and the other names are trademarks of their owners. They are used here only to say what this plugin works with.

Bots use your own model quota, and they read and write files and run commands when you ask them to. Check important actions yourself.
