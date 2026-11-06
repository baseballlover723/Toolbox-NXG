# Publishing Announcements

Toolbox displays a popup to users when there are new entries in the `r/toolbox_nxg` wiki page `announcements`. This is how the team communicates release notes, breaking changes, and other important news without requiring a code deploy.

---

## Using the built-in composer

Moderators of `r/toolbox_nxg` can manage announcements from inside the extension (the code lives in `extension/data/modules/announcements/`):

- **Make Toolbox announcement** — a button on each post in `r/toolbox_nxg`. It opens the composer with that post attached as the announcement's link.
- **Manage announcements** — a modbar button shown while viewing `r/toolbox_nxg`. It lists existing announcements and lets you remove them, edit ones that are still scheduled, or start a new one.

The composer takes a title, body, optional link and link label, optional build-type targeting, and an optional future publish time. It assigns the `id` and `publishAt` for you and writes the wiki page with a conflict-safe read-modify-write, so a concurrent edit by another moderator is not overwritten. If the page holds invalid JSON or an unrecognized format (for example a newer `version`), the composer refuses to write until the page is fixed by hand, so existing notes are never lost.

Both buttons render only for moderators of `r/toolbox_nxg`.

---

## The wiki page

You can also edit [r/toolbox_nxg/wiki/announcements](https://www.reddit.com/r/toolbox_nxg/wiki/announcements) directly. The page must contain valid JSON matching this structure:

```json
{
    "version": 1,
    "notes": [
        {
            "id": "2025-06-14-1",
            "title": "Toolbox 8.0 Released",
            "body": "Toolbox 8 brings a new config popup and much faster loading. Thanks for your patience during the beta.",
            "publishAt": 1749902400,
            "link": "https://www.reddit.com/r/toolbox_nxg/comments/abc123/toolbox_8_release_notes/",
            "linkLabel": "Read the release notes"
        }
    ]
}
```

The composer keeps the `notes` array newest first, but order doesn't matter for display — the extension filters by `id`, not position.

---

## Fields

| Field        | Required | Description                                                                                                                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`         | **Yes**  | Stable unique slug. Once published, never change it — it's the key used to track whether a user has seen this note. The composer generates `YYYY-MM-DD-N` (the publishing day plus a counter); keep that form when editing by hand. |
| `title`      | **Yes**  | Short headline shown in the popup.                                                                                                                                                                                                  |
| `body`       | **Yes**  | Plain-text message body (1–3 sentences). No markdown — it renders as-is.                                                                                                                                                            |
| `publishAt`  | No       | Go-live time as a Unix timestamp in **seconds**. Shown as the note's date, and a note whose `publishAt` is in the future stays hidden until then. The composer always sets it (to now, or the scheduled time).                      |
| `link`       | No       | URL opened in a new tab when the user clicks the link button. Must be an absolute `http://` or `https://` URL; any other value is not rendered as a link.                                                                           |
| `linkLabel`  | No       | Label for the link button. Defaults to `"Read more"` if omitted.                                                                                                                                                                    |
| `buildTypes` | No       | Limits which build types see this note. Omit to show on all builds. See below.                                                                                                                                                      |

### Targeting by build type

To show a note only on specific builds, add a `buildTypes` array:

```json
{
    "id": "2025-07-02-1",
    "title": "Beta feedback needed",
    "body": "We're looking for feedback on the new config popup. Please report any issues.",
    "buildTypes": ["beta"]
}
```

Valid values: `"stable"`, `"beta"`. Omitting the field is equivalent to showing it on all builds. `"dev"` is not a valid target: dev builds never display announcements.

---

## How it works

On every page load, Toolbox:

1. Fetches `r/toolbox_nxg/wiki/announcements` as JSON.
2. Drops notes whose `publishAt` is still in the future.
3. Filters notes by `buildTypes` (if set).
4. Skips any note whose `id` is already in the user's `seenNotes` setting (`Toolbox.Announcements.seenNotes`).
5. If there are unseen notes, shows the popup.

The popup pages through multiple notes if there are more than one, and marks a note as seen when the user pages away from it or closes the popup. A note the user never views (for example, after a quick reload) stays unseen and appears again on a later page load. Users cannot un-dismiss a note — once seen, it won't appear again unless the `id` changes (which you should not do).

Dev builds never fetch the wiki and never show the popup.

---

## Adding a new announcement

Use the composer where possible. When editing the wiki by hand:

1. Write a short `body` (1–3 sentences). Keep the `title` under ~60 characters so it fits the popup header without truncation.
2. Choose an `id` that won't collide with past entries, in the `YYYY-MM-DD-N` form the composer uses.
3. Set `publishAt` to the current time in epoch seconds (or a future time to schedule the note).
4. Add a `link` if there's a post or changelog to point to.
5. Add the new note to the `notes` array in the wiki. Do not remove old entries — users who haven't loaded Toolbox yet still need them.
6. Save the wiki page. The change takes effect on the next page load for anyone who hasn't seen the note (once `publishAt` has passed).

---

## Retiring old announcements

Old notes stay in the wiki indefinitely — removing them (by hand or from **Manage announcements**) is harmless (users who already saw them won't see them again regardless), but there's no reason to do so either. Trim the list if it grows unwieldy.
