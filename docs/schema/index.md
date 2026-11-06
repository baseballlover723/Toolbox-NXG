# Schema Reference

Toolbox-NXG stores subreddit settings and user data in Reddit wiki pages as versioned JSON. Third-party applications can read and write this data to integrate with Toolbox features.

```{toctree}
:maxdepth: 1

config
domain-tags
usernotes
usernotes-shards
subreddit-notes
proposals
```

## Wiki page paths

All Toolbox-NXG data lives in subreddit wikis under the `toolbox-nxg/` path prefix (NXG layout) alongside legacy pages (classic layout). The in-memory model is always the NXG format; classic pages are maintained as compatibility mirrors for 6.x clients.

| Data                                                         | NXG wiki page                                                                                         | Classic wiki page                |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| Subreddit config (removal reasons, macros, ban macros, etc.) | `toolbox-nxg`                                                                                         | `toolbox`                        |
| Usernotes                                                    | `toolbox-nxg/usernotes` (manifest), `toolbox-nxg/usernotes/<slug>` ([shards](usernotes-shards.md)), … | `usernotes`                      |
| [Domain tags](domain-tags.md)                                | `toolbox-nxg/domain-tags`                                                                             | _(embedded in `toolbox` config)_ |
| [Proposals](proposals.md)                                    | `toolbox-nxg/proposals`                                                                               | _(none — NXG-only)_              |
| Subreddit notes index (classic: "personal notes")            | `toolbox-nxg/notes`                                                                                   | `notes/index` (v1 subset)        |
| Subreddit note content                                       | `toolbox-nxg/notes/<slug>`                                                                            | `notes/<slug>`                   |
| Personal settings backup                                     | `toolbox-nxg/user-settings`                                                                           | `tbsettings`                     |

All pages are restricted to moderator-only access by wiki page settings (`permlevel: 2`).

## Interoperability notes

**NXG always reads both layouts.** On first access for a subreddit, NXG up-converts any existing classic data to the NXG format. While 6.x compatibility is on for the subreddit (the default for subreddits that already had Toolbox data), subsequent accesses reconcile-merge classic-page edits (made by 6.x clients) back into the NXG data.

**Layout metadata.** The `toolbox-nxg` config page carries a `Toolbox.Utils.compatibilityWrites` boolean (the per-subreddit 6.x compatibility flag). When compatibility is turned off, the classic `toolbox` page is overwritten with a tombstone, `{"Toolbox.Utils.wikiLayout": "nxg"}`, and the classic pages stop being maintained.

**Write to the classic layout when in doubt.** Third-party tools that need to write data and aren't sure whether a subreddit is migrated to NXG should write to the classic layout (`toolbox`, `usernotes`). While 6.x compatibility is on, NXG will reconcile those writes into its own layout on the next access; if the `toolbox` page is a tombstone, write to the NXG layout instead.

**Do not create shard pages without updating the manifest.** The usernotes NXG layout uses a manifest-plus-shards design. If you create new shard pages without updating the manifest, NXG will never read them.

**Preserve unknown fields.** New schema versions may add fields. When round-tripping a config or usernotes blob, write back any fields you did not recognize rather than silently dropping them.

## Getting help

If you have questions about integrating with Toolbox-NXG data formats, please [open an issue on GitHub](https://github.com/toolbox-nxg/toolbox-nxg/issues) or post to [/r/toolbox_nxg](https://www.reddit.com/r/toolbox_nxg).
