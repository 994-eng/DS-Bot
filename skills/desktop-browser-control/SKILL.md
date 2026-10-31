---
name: desktop-browser-control
description: Open a page on the visible desktop and verify it with a screenshot. Use the EGO capability for the page and the CUA capability for the screen.
---

# Desktop browser control

Use this when the user must see a page on the Bot’s screen. Open it in Google Chrome on the virtual desktop at `http://38.76.188.71:3211`. The in-app screen is spacesd screenshots, not a viewer page. That is the screen in the sidebar. Do not use a headless browser. DS-Bot is not Hermes. EGO is the browser. CUA is the desktop. Call the capabilities below. Do not invent a bridge between them.

## When to use

- The user wants the page open on the desktop, or must look at it, scan a code, or finish a login.
- You need a picture of the rendered page, not only its text.
- Do not use this for bulk reading. That is the EGO capability alone.

## Which capability

| Work | Capability |
|---|---|
| Open the URL, read the page, click or type in the page, DevTools, network log | EGO |
| Screenshot of the Bot’s screen, mouse and keyboard on the desktop outside the page | CUA (spacesd) |

One Bot, one screen. Do not drive another Bot’s display.

## Procedure

1. Say which surface you are using, in one line, and call the tool in that same turn.
2. Open the URL with the EGO capability, in this Bot’s own browser space.
3. Take a CUA screenshot of this Bot’s screen. Check the picture. If the page is missing, say what is on the screen instead.
4. Act, then take another CUA screenshot. Stop when the picture matches the goal.
5. If the page is waiting for a login, hand that to the user. Do not type a password, card number, or one-time code.

## Verify

- The later screenshot shows the page, or the login the user has to finish.
- The reply names the screen, the URL, and the next step.
- No credential was typed by the Bot.

Adapted from the MIT `desktop-browser-control` skill in the LightVela pack (author Hermes Agent). Hermes tool names such as `browser_exec`, `computer_use`, and `vision_analyze` are not tools in DS-Bot.
