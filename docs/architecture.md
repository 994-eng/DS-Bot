# Architecture of this fork

English. The decided behavior of upstream DS Bot stays in [docs/plans/](plans/). This page is the 994-eng fork: a desktop client aimed at Grok Bot and Groupbot, built beside `ds-bot/` and `app/` without patching DeepSeek Harness.

DS Bot remains a DSH plugin plus a desktop shell. Bots, memory, groups and capabilities are unchanged. The fork adds four pillars.

## 1. Cua spacesd, the Linux control plane

[cua-spacesd](https://cua.ai/docs/cua-sdk/guides/spacesd) from [trycua/cua](https://github.com/trycua/cua) is the computer-use substrate. It is not an X11 daemon written for this repo, and it is not an MCP server on stdio.

| | |
|---|---|
| Port | TCP 3211, native gRPC (HTTP/2) and gRPC-Web (HTTP/1.1). UDP 3212 is Cua's media path and is unused here |
| Auth | `authorization: Bearer <token>`, or `x-cua-env-authorization` when a gateway takes `authorization`. The token is never put in a URL |
| Package | `cua.env.v1` |
| Input | `ComputerService` `Screenshot`, `Pointer`, `Keyboard`. Pointer and keyboard are delivered by Cua Driver |
| Structure | `WindowsService`, `AccessibilityService` (`GetTree`), `DriverService` `ListTools` / `CallTool` |
| Live client | `@trycua/cua` `callJson('ComputerService/Screenshot', proto3 JSON)`. `attachTrycua()` wraps that. Connecting does not delete a sandbox |
| Tests | `createMockSpacesd()` serves the same `/cua.env.v1.<Service>/<Rpc>` paths with gRPC-Web JSON frames |

`extensions/linux-desktop/` is the host client. `createDesktopBridge()` is what a plugin tool would call. DS-Bot Capabilities (MCP, skills, packs) stay the library the user attaches to a Bot. They do not replace spacesd. When a tool is registered later, it uses the public `ctx.tools.register` API and its body calls the bridge. That registration is not in `index.js` yet: there is no spacesd URL until the desktop app has one, and an empty URL must not become a shell command.

A thinner HTTP plane, `GET /screenshot` and `POST /action` ([desktop-sandbox](https://github.com/arthurkatcher/desktop-sandbox)), exists in `sandbox-fallback.js` for a guest that cannot run spacesd. It is not the default.

## 2. ego, the agent browser

[ego(lite)](https://lite.ego.app/document/en/docs/ego-browser) ([citrolabs/ego-lite](https://github.com/citrolabs/ego-lite)) drives a real Chromium. A Task Space is an isolated context in that shared process. This fork maps one Task Space to one Bot (`bot:<id>`).

`extensions/windows-browser/` talks to a runtime shaped like `globalThis.ego` (`createTaskSpace`, `useTaskSpace`, `createTab`, `listTabs`, `snapshot`, `sendCDPMessage`). The mock runtime is what the tests drive.

DevTools for a person is F12. For an agent, `devtools()` enables CDP `Network` and sends F12 on that space. The network log redacts `Authorization`, `Cookie`, `Set-Cookie`, secret query parameters and secret JSON keys before it can be returned. Raw headers, cookie reads, `Runtime.evaluate` and downloads go through `ApprovalGate` and are denied unless a decider allows that call.

Lightpanda and agent-browser are CDP-shaped alternatives. They are noted, not wired. Playwright `connectOverCDP` is the fallback when ego is absent, including a Chrome on Windows started with a debugging port.

### The existing Playwright bridge

DS Bot already attaches Playwright to the desktop panel:

- `ds-bot/src/host/browser/` registers `refs`, `script` or `task` for the whole team, with one profile per Bot.
- `app/src/bot-browser.mjs` keeps an Electron partition per Bot. The user and the Bot see the same tabs in the app.
- The decided design does not make Chrome DevTools a fourth plugin.

This fork does not change that. The panel browser still works as before. Packet capture is the ego (or explicit CDP) session, not a new mode inside `refs` / `script` / `task`.

## 3. A virtual screen per Bot

Groupbot shows the agent you clicked, on its own display, in a side column. The same idea here:

```
+------------------+---------------------------+----------------------+
| Team             | Conversation              | Virtual screen       |
| * Chief          |                           | Writer's screen      |
|   Writer  <----- |  ...                      | +------------------+ |
|   Coder          |                           | | this Bot only    | |
+------------------+---------------------------+----------------------+
        click a Bot              the column follows that Bot
```

- Open a Bot's panel and choose **Screen** (the `···` menu). The right-hand column shows that Bot's screen.
- Click another Bot in the team list. The conversation follows, and a column already on Screen follows too (`followPanel` keeps `view: 'screen'` for a Bot).
- **Details** in the screen bar returns to the Bot page.
- `ds-bot/src/client/virtual-screen.js` is the panel model: `screen:<botId>`, and pointer events recorded on one Bot do not appear on another.
- `app/src/virtual-screens.mjs` is the desktop host's framebuffers. One `sharedRoot` (`/data`). Each `frame(botId)` is a copy.

The column does not yet decode a live spacesd PNG into the Electron window. The screen id and the isolation rules are in place so that wiring is a later paint, not a new product decision.

## 4. Cloud desktop

`extensions/cloud-desktop/` describes one machine:

- Image `ghcr.io/trycua/linux:24.04`, which already includes cua-spacesd.
- Port 3211 on loopback, viewer at `/viewer/` on that port. noVNC on 6080 is the extra view of the X display.
- `DISPLAY=:1`. On an image that has no display, the fallback command is `Xvfb :1 -screen 0 1280x800x24`. spacesd still owns input. This repo does not ship its own X11 daemon.
- Shared files: the host directory mounted at `/data` (default `/var/lib/ds-bot/shared`).
- One display id per Bot (`bot:<id>`), assigned by `assignBotScreens` and stamped onto RPCs by the linux-desktop router.

`requestLaunch()` requires the `display.launch` approval and returns the `docker run` argv. It does not start a container. The argv contains no token.

## What a Bot is allowed to do

| Action | Gate |
|---|---|
| Screenshot, pointer, keyboard, accessibility tree, redacted Network log, open a page | Allowed |
| Clipboard, cookies, `Runtime.evaluate`, downloads, raw network log, start the desktop | Denied until a decider allows that call |

The gate is local to the extensions. It is not yet a DSH approval card. DS-Bot's existing secret substitution on model requests still applies.

## Gaps still open

- No multi-tenant orchestrator. One spacesd the user runs.
- The planner understands a quoted click and a quoted type. It is not a model loop. The Bot's model is what reads the PNG.
- Live spacesd is protobuf. The mock speaks gRPC-Web JSON on the same paths. Production attach is `@trycua/cua`, which this repo does not depend on.
- The sidebar does not stream pixels from spacesd yet.
- ego is not bundled. A Windows browser means ego on that machine, or CDP to Chrome there. There is no Windows VM in this repository.
- The three Playwright plugins are unchanged, including their refusal to be a DevTools backend.
- Capabilities are not auto-registered. A tool that calls the bridge waits until a spacesd URL exists.
- Launch is a recorded command, not a running container.

## Where the code sits

```
extensions/linux-desktop/     spacesd client, mock, per-Bot router
extensions/windows-browser/   ego session, redacting capture, Playwright fallback
extensions/cloud-desktop/     shared machine description
extensions/computer-use/      redact, approve, plan, PNG
ds-bot/src/client/            Screen view in the existing right-hand panel
app/src/virtual-screens.mjs   per-Bot framebuffers on one shared root
```

Upstream files under `ds-bot/src/host/browser/` and `app/src/bot-browser.mjs` are the Playwright bridge. Leave them on that job.

## Default machine and the model prompt

The Windows client hardcodes `http://38.76.188.71:3211` and the viewer at `/viewer/` (`app/src/cloud-backend.mjs`). It sets those URLs when they are empty. It does not set a token, and it has no login, registration, or email route.

DSH loads [docs/harness-identity-prompt.md](harness-identity-prompt.md) through `ctx.systemPrompt.section` (`fork-environment`, order 630) in `ds-bot/src/host/prompt.js`. GUI work defaults to the visual desktop: a CUA screenshot, an action, then another CUA screenshot. Browser-centric work uses the EGO capability. The plugin does not rewrite a tool call from one into the other.

## Skills

DSH’s filesystem skill provider reads one level of `SKILL.md` bundles from these roots, in rank order: `<project>/.dsh/skills`, `<project>/.agents/skills`, custom dirs, `<DSH_HOME>/skills` (default `~/.dsh/skills`), and `<agents home>/skills`. The desktop app’s `DSH_HOME` is its own data folder, not `~/.dsh`.

This fork’s skills are `skills/computer-use-desktop/` and `skills/desktop-browser-control/`. On the server:

```sh
mkdir -p "$DSH_HOME/skills"
cp -a skills/computer-use-desktop skills/desktop-browser-control "$DSH_HOME/skills/"
```

The plugin also registers that `skills/` directory when it sits next to `ds-bot/` (or when `DS_BOT_DESKTOP_SKILLS` points at it), through `ctx.skills.registerProvider` in `ds-bot/src/host/desktop-skills.js`. The model loads a skill with the harness `skill` tool.

`vendor/lightvela-computer-use/` is the LightVela/Hermes computer-use reference (Cua driver session, one Xfce screen per profile). DS-Bot does not execute it. The live desktop remains cua-spacesd.

CI does not connect to `38.76.188.71`. A test can check the host string, the missing login routes, and the prompt text. A live screenshot, a real spacesd RPC, and an ego Task Space on that machine need the server and are outside CI.

