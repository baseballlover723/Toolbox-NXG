# Mod Actions

**Platforms:** New Reddit only · **Default:** Enabled

The Mod Actions module adds inline moderator-action buttons to each post and comment on new Reddit (Shreddit), so you can act on content without opening the native overflow menu.

## Overview

This module runs only on the Shreddit UI. On old Reddit, Toolbox-NXG provides its own mod buttons, so the module registry skips Mod Actions there. The buttons appear in the Toolbox action row beneath each post or comment.

## Features

**Inline action buttons** — quick controls for the most common moderator actions are placed directly on each post and comment:

- **Spam** and **Remove** — remove the item (as spam, or as a regular removal) via the removal reasons options. Shown only while the item is not already removed.
- **Approve** — approve the item. Always shown, so you can also clear reports on an item that has not been removed.
- **Lock / Unlock** — lock or unlock the post or comment.
- **Distinguish** — distinguish your own comment as a moderator (Reddit only allows distinguishing your own comments).
- **Sticky / Unsticky** — pin a post to the subreddit, or distinguish-and-sticky your own top-level comment. Reddit only allows stickying top-level comments, so the control is not offered on nested replies.
- **Mark NSFW / Unmark NSFW** — toggle a post's NSFW flag (posts only).

The recent moderator actions taken on an item are surfaced separately, by the [Queue Tools](queue-tools.md) module's recent-actions table (available on both old and new Reddit).

## Settings

This module has no user-facing settings beyond the enable/disable toggle.
