# Extensions

This fork adds four optional pieces beside the DS-Bot plugin. None of them patch DeepSeek Harness. The plugin keeps using the documented DSH tool and capability APIs.

| Directory | Role |
|---|---|
| [`linux-desktop/`](linux-desktop/) | cua-spacesd client (gRPC on port 3211): screenshots, pointer, keyboard, windows, accessibility |
| [`windows-browser/`](windows-browser/) | ego(lite) Task Spaces, DevTools network capture, Playwright CDP fallback |
| [`cloud-desktop/`](cloud-desktop/) | One shared Linux desktop (Cua image, viewer, shared `/data`, per-Bot displays) |
| [`computer-use/`](computer-use/) | Redaction, approval gates, and the small planner both desktops use |

Run the tests from the repository root:

```sh
node --test extensions/*/test/*.test.js app/test/virtual-screens.test.mjs
```
