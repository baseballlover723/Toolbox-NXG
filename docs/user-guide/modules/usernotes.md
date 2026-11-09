# Usernotes

**Platforms:** Old Reddit and New Reddit · **Default:** Enabled

Usernotes lets moderators attach persistent notes to Reddit user accounts. Notes are stored in the subreddit wiki and visible to all moderators of that subreddit.

Reddit's own native mod notes are a separate feature with their own button; see [Native Mod Log](native-mod-log.md).

## Overview

Usernotes appear next to usernames throughout Reddit — in post listings, comment threads, and the mod queue. A colored tag shows the most recent active note type; hovering or clicking reveals the full note list for that user in the current subreddit.

## Adding a note

Click the usernotes tag next to a username to open the usernotes popup. In the **Add Toolbox note** section, choose a type, enter the note text, and optionally include a link to the relevant post or comment. Click **Save for /r/...** (followed by the subreddit name) to write the note to the wiki.

A new note can also be created automatically alongside a removal reason or mod action when the relevant option is selected in the removal reasons dialog.

### Save requirements

A note can be required to contain a type, body text, and/or a link before it can be saved. The save button stays disabled (with a hint explaining what's missing) until the requirements are met. Requirements come from two places, combined so the **more restrictive wins**:

- **Your personal settings** (below) — apply everywhere you moderate.
- **The subreddit's settings** — configured by the subreddit's mods in the Config overlay's **Usernotes settings** tab. When that tab's enforcement mode is _suggest_ or _require_, the subreddit's requirements act as a floor you can't drop below; under _leave_ (the default), only your personal settings apply.

Text is required by default. In the removal-reasons dialog the note text auto-fills from the reason, so only the type and link requirements can block sending.

## Note types

Note types control the color and label shown in the tag. Each subreddit can define custom types in the Config overlay (**Edit usernote types** tab). Types have:

- **Label** — display name shown in the popup and as a tooltip on the tag.
- **Color** — the tag color in light mode.
- **Dark color** — optional separate color for dark mode.
- **Auto-ban duration** _(optional)_ — when set, the popup offers a one-click ban for the configured duration (in days; 0 = permanent ban) whenever a note of this type is saved. If the subreddit has named ban macros, an **Apply ban macro...** picker beside that ban fills its message from one; the note type still sets the duration.
- **Auto-archive threshold** _(optional)_ — notes of this type older than the specified number of days are automatically archived on every save.

If a subreddit has no custom types configured, the built-in defaults are used:

| Key         | Label            | Color    |
| ----------- | ---------------- | -------- |
| `gooduser`  | Good Contributor | green    |
| `spamwatch` | Spam Watch       | fuchsia  |
| `spamwarn`  | Spam Warning     | purple   |
| `abusewarn` | Abuse Warning    | orange   |
| `ban`       | Ban              | red      |
| `permban`   | Permanent Ban    | dark red |
| `botban`    | Bot Ban          | black    |

### Merging types

Each note records its type by an internal key, not by its label. Toolbox 6.x created a new key whenever a type was recreated or renamed, so a long-running subreddit can end up with several types that mean the same thing, e.g. an older "Spam Warning" and a newer "Rant Warning" that mods used for the same purpose. NXG lists every type that existing notes use, so these show up side by side.

To fold one into another, open the **Edit usernote types** tab, click **Merge into...** on the type to retire, pick the type its notes should move to, and click **Merge**. The note counts on each card help tell apart types that share a name. The move takes effect when you click **Save usernote types**: every note of the merged type (archived ones included) switches to the chosen type, and the merged type is removed.

## Archiving

Archived notes are hidden from the active note list but kept permanently. They can be revealed with the **Show archived notes** button in the usernotes popup.

Notes can be archived manually from the popup, or automatically:

- **Auto-archive by type** — set an `autoArchiveDays` threshold on a note type; notes of that type older than the threshold are archived on every save.
- **Legacy-delete reconciliation** — when a moderator on original Toolbox deletes a note from the classic `usernotes` wiki page, NXG detects the deletion on next read and archives the note rather than losing it.

## Settings

| Setting                               | Default | Description                                                            |
| ------------------------------------- | ------- | ---------------------------------------------------------------------- |
| Show Usernotes Manager link in Modbar | On      | Add a usernotes manager link to the Modbar                             |
| Close popup after saving a note       | On      | Dismiss the usernotes popup automatically after saving                 |
| Require a note type                   | Off     | Require a type/tag before a note can be saved                          |
| Require note text                     | On      | Require body text before a note can be saved                           |
| Require a link to the content         | Off     | Require a link to the relevant post/comment before a note can be saved |
| Show date in note preview             | Off     | Include the note date in the inline tag preview                        |
| Show current note on mod pages        | Off     | Display the current note inline on ban/contrib/mod pages               |
| Max characters in note preview        | 20      | Maximum characters shown in the inline tag _(advanced)_                |
