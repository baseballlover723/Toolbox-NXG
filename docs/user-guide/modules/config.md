# Toolbox-NXG Config

**Platforms:** Old Reddit and New Reddit · **Default:** Enabled

The Config module provides the per-subreddit configuration overlay, letting moderators manage removal reasons, mod macros, usernote types, domain tags, and other subreddit-level settings.

## Overview

Open the config overlay from the Modbar — it is accessible on any subreddit page you moderate. Changes are saved to the subreddit wiki when you click Save. If 6.x compatibility writes are enabled, the save also updates the classic `toolbox` wiki page so moderators on the original Toolbox see the changes.

Each subreddit's configuration is independent. Toolbox-NXG stores it at `toolbox-nxg` in the subreddit wiki.

## Tabs

**Settings Home** — pointers and handy links for the subreddit's configuration.

**Edit usernote types** — configure the note type labels, colors, and dark-mode colors shown in the usernotes popup. Each type can optionally have an auto-ban duration and an auto-archive threshold. Built-in defaults are used when this list is empty.

**Usernotes settings** — choose what a usernote must contain before it can be saved in this subreddit (a type, body text, and/or a link to the content), and how those requirements apply to other moderators: _suggest_ them, _require_ them, or _leave_ it up to each moderator's personal settings. When the subreddit enforces requirements, the more restrictive of the subreddit's settings and a moderator's personal settings always wins. See [Usernotes](usernotes.md) for the matching personal settings.

**Training mode** — choose which moderators are in training and how long resolved proposals are kept. See [Training Mode & Second Opinions](proposals.md).

**Edit AutoModerator config** — edit the subreddit's AutoModerator config wiki page.

**Removal reasons settings** — the message template (modmail subject, header, footer), removal actions (sticky/lock the removal comment, send via modmail as the subreddit, auto-archive, lock the removed thread), moderator enforcement, and advanced options such as the removal log subreddit (logsub) and getting reasons from another subreddit.

**Edit removal reasons** — add, edit, reorder, and delete removal reasons. Each reason has a title, message text (with support for substitution tokens and interactive brace tokens), and reply-type settings. See [Removal Reasons](removal-reasons.md) for the token format.

**Suggested removal reasons** — map report text to removal reasons so they're pre-selected in the removal overlay when an item's report matches. See [Suggested removal reasons](removal-reasons.md#suggested-removal-reasons).

**Edit mod macros** — manage mod macros: pre-written messages with optional attached actions (remove, approve, ban, flair, distinguish, lock, sticky, archive modmail, and more). Macros appear in a dropdown inside reply areas. See [Mod Macros](macros.md) for details.

**Domain tags** — tag specific domains with a color, or import tags from another subreddit. Tagged domains appear with a colored indicator on link posts in the mod queue and listings.

**Ban macro** — pre-fill the Mod Button's ban note and ban message with text and tokens, and set the default ban duration and duration preset buttons.

**Toolbox 6.x compatibility** — control whether the old Toolbox 6.x wiki pages are kept in sync for this subreddit.

**Edit raw toolbox config** and **Edit usernotes** _(advanced)_ — edit the subreddit's raw config and usernotes JSON directly.

## Settings

The Config module has no personal settings of its own — all configuration lives in the subreddit wiki and is shared with all moderators.
