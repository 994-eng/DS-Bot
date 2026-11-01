# Linux desktop

Agent access to a Linux graphical desktop goes through [cua-spacesd](https://cua.ai/docs/cua-sdk/guides/spacesd) (Cua, [trycua/cua](https://github.com/trycua/cua)). spacesd is the control plane. This package does not start an X11 daemon of its own, and it does not speak MCP over stdio.

## What spacesd is

`cua-spacesd` listens on TCP **3211** for native gRPC (HTTP/2) and gRPC-Web (HTTP/1.1). The env token is the header `authorization: Bearer <token>` or `x-cua-env-authorization: Bearer <token>`. Do not put the token in a URL.

The calls this host uses are `cua.env.v1`:

| Service | Methods |
|---|---|
| `ComputerService` | `Screenshot`, `Pointer`, `Keyboard`, `GetClipboard`, `SetClipboard`, `ListDisplays` |
| `DriverService` | `ListTools`, `CallTool` (Cua Driver) |
| `WindowsService` | `ListWindows`, and the other window RPCs |
| `AccessibilityService` | `GetTree`, `Find`, `Act` |
| `SystemService` | `GetCapabilities` |

Pointer and keyboard go to Cua Driver inside the guest. Screenshots come back as PNG bytes plus a `screenshotId`. The accessibility tree is what the planner reads; the Bot's own model reads the image.

A live server speaks protobuf. Attach with [`@trycua/cua`](https://cua.ai/docs/cua-sdk/guides/own-harness) `callJson('ComputerService/Screenshot', json)`, which is proto3 JSON over that gRPC channel. `attachTrycua()` in `src/spacesd-client.js` does that when the package is installed. Connecting does not create or delete a sandbox.

## How DS-Bot calls it

DS-Bot Capabilities stay MCP servers, skills and packs. They are not the desktop control plane. The desktop app holds a spacesd URL and token, and a future plugin tool (the public `ctx.tools.register` API, no DeepSeek Harness patch) calls `createDesktopBridge()`. The bridge stamps each Bot's display id onto the RPC so one spacesd can keep a framebuffer per Bot.

```js
import { createDesktopBridge, createSpacesdClient } from './src/index.js'

const client = createSpacesdClient({ url: process.env.CUA_SPACESD_URL, token: process.env.CUA_ENV_TOKEN })
const desktop = createDesktopBridge({ client, botIds, gate })
await desktop.plan(botId, 'click "Terminal" and type "echo hi"')
```

`CUA_ENV_TOKEN` stays in the environment or in spacesd's token file. It is not written into a capability, a skill, or a chat.

Clipboard reads and writes are privileged. The approval gate denies them unless a decider allows that one call. Screenshot, pointer and keyboard are ordinary.

## Mock

`createMockSpacesd()` serves the same `/cua.env.v1.<Service>/<Rpc>` paths with gRPC-Web JSON frames, on an ephemeral port. Tests use it. It is not a second protocol. Point the same client at a real spacesd only through `attachTrycua()`.

## Fallback

If a full Cua guest is too heavy, `src/sandbox-fallback.js` can talk to a [desktop-sandbox](https://github.com/arthurkatcher/desktop-sandbox) HTTP plane: `GET /screenshot` and `POST /action`. That path is not the default.

## Shared machine

One cloud desktop runs one spacesd. Each Bot gets `displayId` `bot:<id>` and the sidebar screen `screen:<id>`. The shared files live on the machine's data directory. See `extensions/cloud-desktop/`.
