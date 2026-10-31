---
name: computer-use-desktop
description: Drive the visual desktop with Cua spacesd. Screenshot, act, then screenshot again. Use EGO only for browser-centric work.
---

# Computer use on the visual desktop

The default surface for a GUI task is the shared visual desktop at `http://38.76.188.71:3211` (viewer `/viewer/`). Each Bot has its own screen. Call tools. Do not reply with only a plan.

## Loop

1. CUA screenshot of this Bot’s screen.
2. Act with the CUA pointer or keyboard.
3. CUA screenshot again, and check it against the goal.

Repeat until the screen matches, or say what blocked you.

## EGO or CUA

- A site, a page, DevTools, or the network log: the EGO capability.
- The desktop itself (windows, menus, the mouse, keys outside a page): the CUA capability.

Do not use one to do the other’s job. If the capability is not attached, say so and stop.

Do not type a password or a one-time code. Hand login to the user.
