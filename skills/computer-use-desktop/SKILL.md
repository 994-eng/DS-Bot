---
name: computer-use-desktop
description: Drive the visible Cua desktop with screenshots, the mouse, and the keyboard. Use this for computer use. Use the EGO skill for the browser.
---

# Computer use (CUA)

CUA is the desktop. EGO is the browser. Do not swap them.

The work happens on the virtual screen the app shows on the right. That screen is the Cua desktop at `http://38.76.188.71:3211` (the window opens `http://38.76.188.71:8890/desktop`). Google Chrome is installed on that desktop. Launch Chrome there. The user must see the window, the pointer, and the keys. Do not drive a headless session or a display that is not this screen.

## When to use

- Windows, menus, the mouse, and the keyboard outside a web page.
- Opening, moving, or closing Google Chrome on the virtual screen.
- Checking that a page or app is actually visible.

A site, a page, DevTools, or the network log is the EGO capability. Load the `ego-browser` skill for that. Still confirm the result with a CUA screenshot of this screen.

## How to act

Call the CUA tool in the same turn you decide. Do not reply with only a plan.

1. Take a CUA screenshot of this Bot's virtual screen.
2. Act with the CUA pointer or keyboard on that same screen.
3. Take another CUA screenshot and check it against the goal.

Repeat until the screen matches, or say what blocked you. If the CUA capability is not attached, say so and stop. Do not use EGO to click the desktop instead.

Do not type a password or a one-time code. Hand login to the user.
