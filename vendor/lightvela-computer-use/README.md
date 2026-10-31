# LightVela computer-use reference

This directory is a cleaned copy of the `computer_use` and `bot_desktop` modules from the LightVela pack. Those modules are Hermes Agent code: they import Hermes packages and talk to `cua-driver` over MCP stdio. **DS-Bot does not run them and is not Hermes.**

They are here so the Cua spacesd bridge in `extensions/linux-desktop/` can follow the same computer-use shape:

- `computer_use/` captures the screen (including a numbered overlay for vision models), then clicks or types, and can keep a driver session.
- `bot_desktop/` starts one Xfce desktop per profile over VNC. That is the same idea as this fork’s per-Bot screen: one shared machine, one display per Bot (`bot:<id>` on spacesd, `screen:<id>` in the sidebar).

DS-Bot’s live path is cua-spacesd gRPC on port 3211 (`ComputerService` screenshot, pointer, keyboard). The Windows client defaults to `http://38.76.188.71:3211`.

Not included: Hermes preview tools, the Hermes Agent skill tree, speech, and the cloud browser plugins (browser-use, Browserbase, Firecrawl). Those plugins are optional backends in the pack. This fork’s browser path is EGO, with Playwright CDP as the fallback.

License: see `LICENSE.MIT`. The pack’s `desktop-browser-control` skill is MIT, author Hermes Agent. The adapted skill DS-Bot ships is `skills/desktop-browser-control/`.
