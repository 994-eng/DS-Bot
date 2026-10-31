# Computer use helpers

Shared pieces for the Linux desktop and the browser extensions:

- `redact.js` redacts `Authorization`, `Cookie`, and other secret headers, query parameters, and JSON keys before a capture can be shown to a model.
- `approval.js` denies clipboard, cookie, evaluate, download, raw network, and display-launch calls unless a decider allows that call.
- `plan.js` turns "click \"Name\" and type \"text\"" into `ComputerService` requests against an accessibility tree.
- `png.js` encodes a small PNG for the spacesd mock.

These modules do not open a socket and they are not an MCP server. cua-spacesd is the desktop control plane. See `extensions/linux-desktop/`.
