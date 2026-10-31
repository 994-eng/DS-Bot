---
name: ego-browser
description: Open and drive web pages with the EGO capability in Google Chrome on the visible virtual screen. Use CUA only to see and operate the desktop around the browser.
---

# EGO browser

EGO is the browser. CUA is the desktop. Do not swap them.

Google Chrome is installed on the server virtual desktop at `http://38.76.188.71:3211`. The app shows that desktop at `http://38.76.188.71:8890/desktop`. Every page you open must appear in Chrome on that screen. Do not use a headless browser, an off-screen profile, or a browser the user cannot see in the sidebar.

## When to use

- Opening a site, reading a page, clicking or typing in a page.
- DevTools and the network log.
- Checking that Chrome on the virtual screen shows the page you opened.

Windows, menus, and the mouse outside the page are the CUA capability. Load `computer-use-desktop` for those.

## How to act

Call the EGO tool in the same turn you decide.

1. Open the URL with the EGO capability in Google Chrome on this Bot's virtual screen.
2. Take a CUA screenshot of that same screen. The screenshot must show Chrome and the page. If it does not, say what is on the screen and stop. Do not continue in a hidden browser.
3. Click or type with the EGO tools inside the page. Use CUA only for the desktop around Chrome.
4. Take another CUA screenshot. Stop when the picture matches the goal.

If the EGO capability is not attached, say so and stop. Do not use CUA to scrape the page instead.

If the page is waiting for a login, hand that to the user. Do not type a password, card number, or one-time code.
