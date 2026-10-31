# Cloud desktop

One Linux machine for the team. Bots share its files and share one [cua-spacesd](https://cua.ai/docs/cua-sdk/guides/spacesd). They do not share a screen.

## What runs

| Piece | Role |
|---|---|
| Image `ghcr.io/trycua/linux:24.04` | Cua's Linux desktop. It already ships cua-spacesd |
| TCP 3211 | gRPC and gRPC-Web. The HTML5 viewer is `/viewer/` on this port |
| TCP 6080 | noVNC, when you want a separate VNC view of the X display |
| `DISPLAY=:1` | The guest display. A generic image can start it with `Xvfb :1 -screen 0 1280x800x24`. The Cua image already has a display; Xvfb is only that fallback |
| `/data` | The shared directory, mounted from the host path in the spec (default `/var/lib/ds-bot/shared`) |

`cloudDesktopSpec()` records that layout. `containerArgv()` is the `docker run` line: loopback ports, the shared volume, no token. The env token stays in the server's token file or in `CUA_ENV_TOKEN` on the machine that connects. `requestLaunch()` asks the approval gate and still does not start Docker.

## Screens

`assignBotScreens(['alpha', 'beta'])` returns one `displayId` (`bot:<id>`) and one sidebar `screenId` (`screen:<id>`) per Bot. The linux-desktop bridge stamps `displayId` onto `ComputerService` calls, so pointer and keyboard for alpha do not land on beta's framebuffer.

The desktop client's right-hand column shows the selected Bot's screen. See `docs/architecture.md`.
