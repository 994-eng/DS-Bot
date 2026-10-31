# Windows and agent browser

The preferred browser for agents is [ego(lite)](https://lite.ego.app/document/en/docs/ego-browser) ([citrolabs/ego-lite](https://github.com/citrolabs/ego-lite)). ego drives a real Chromium session. A **Task Space** is one isolated browser context (tabs, cookies, storage) inside that shared process. DS-Bot gives each Bot its own Task Space, named `bot:<id>`, so Bots do not share cookies. That matches the existing rule that each Bot has its own browser.

This package does not vendor ego. The desktop app passes a runtime with the same methods as `globalThis.ego`:

- `createTaskSpace(name)`
- `useTaskSpace(id)`
- `createTab(url)`
- `listTabs()`
- `snapshot()`
- `sendCDPMessage({ method, params })`

`createMockEgo()` is that surface for tests.

## DevTools and packet capture

Opening DevTools is F12 for a person. For an agent, `session.devtools()` enables the CDP Network domain (`Network.enable`) and sends F12 (`Input.dispatchKeyEvent`) on that Task Space. Entries recorded after that are returned by `session.network()`.

By default the log redacts `Authorization`, `Cookie`, `Set-Cookie`, and other secret headers, secret query parameters, and secret JSON keys. A raw log is a privileged call and the approval gate denies it. `Network.getCookies`, `Runtime.evaluate`, and downloads are privileged too. Ordinary navigation, snapshots, and a redacted Network panel are not.

## Playwright, and the DS-Bot bridge

Playwright is the fallback when ego is not installed. `connectPlaywright(endpoint)` uses `chromium.connectOverCDP` for a Windows Chrome (or any CDP endpoint). Lightpanda and agent-browser are other CDP-shaped options; they are not wired here. Ego remains the path that already has Task Spaces.

DS-Bot already has a Playwright browser bridge:

- `ds-bot/src/host/browser/` mounts the `refs`, `script` and `task` plugins.
- `app/src/bot-browser.mjs` keeps one Electron partition per Bot.
- The decided design does not add Chrome DevTools to those three plugins.

This extension does not replace that bridge. The panel browser stays as it is. DevTools capture lives here, on the ego Task Space or on an explicit CDP endpoint. A Windows worker is "ego on that machine" or "CDP to Chrome on that machine", not a browser built into this repository.

## Approval

Pass an `ApprovalGate` from `extensions/computer-use`. The default decider denies privileged calls.
