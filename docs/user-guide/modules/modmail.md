# Modmail

**Platforms:** New Reddit only · **Default:** Enabled

The Modmail module enhances the new Reddit (Shreddit) modmail UI with quality-of-life improvements for moderators.

## Overview

This module operates only on `www.reddit.com/mail/`. It adds mod macro support to the composer, quality-of-life tweaks to the reply interface, and timestamp improvements to the message list.

## Features

**Mod macros in modmail** — a macro picker appears next to the saved-responses dropdown in the modmail composer. Selecting a macro inserts its text (with token substitution) into the reply box, just as in post and comment reply areas.

**Markdown preview auto-enable** — when enabled, the preview button in the modmail composer is automatically clicked as soon as you start typing, so formatted output is always visible.

**Search bar always visible** — pins the modmail search bar to the top of the page and hides the toggle button, saving a click each time you want to search.

**Recent message timestamps** — messages posted within the last 24 hours show an exact time (e.g. "Jun 4, 3:05 PM") alongside the date, making it easier to gauge recency at a glance.

**Compact user sidebar** — optionally hides the banner strip and profile picture at the top of the modmail user sidebar and widens the username area, for a denser text-first header.

**Profile on username click** — when the user info sidebar is already open, clicking a participant's username opens their profile page (in a new tab) instead of re-opening the sidebar. Off by default.

**Single-panel user sidebar** — optionally replaces the Posts/Comments/Log tabs in the modmail user sidebar with a single scrollable panel that shows all sections at once. Off by default.

## Settings

| Setting                        | Default | Description                                                                                                              |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| Markdown preview by default    | On      | Auto-enable preview when typing in the modmail composer                                                                  |
| Search bar at top              | On      | Always show the modmail search bar, hide the toggle button                                                               |
| Show recent message time       | On      | Show exact time for messages less than 24 hours old                                                                      |
| Hide user sidebar profile icon | Off     | Hide the banner + profile picture in the modmail user sidebar and widen the username area                                |
| Open profile when sidebar open | Off     | Click a username to open their profile when the user info sidebar is already open                                        |
| Replace user sidebar tabs      | Off     | Show the user sidebar's Posts/Comments/Log sections in one scrollable panel instead of tabs                              |
| Open modmail in a new tab      | Off     | Open modmail in a new tab from the Modbar's modmail icon, count and menu, and from the modmail button in Reddit's header |

**Open modmail in a new tab** works on old Reddit too, even though the rest of this module is new Reddit only: the Modbar applies it, so it covers both old Reddit's green modmail icon and new Reddit's header modmail button at the top right. Middle-click and Ctrl/Cmd+click behave as usual.
