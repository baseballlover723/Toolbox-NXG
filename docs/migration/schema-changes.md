# Schema Changes

Toolbox-NXG introduces a new wiki layout (`toolbox-nxg`) alongside the classic `toolbox` wiki page. This page explains what changed, why, and how both layouts coexist during the transition period.

For the full technical specification of each schema version, see [Subreddit Config Schema](../schema/config.md).

## Overview of changes

NXG makes three major changes to how subreddit data is stored:

1. **New wiki paths** — subreddit config moves from `toolbox` to `toolbox-nxg`; usernotes move from `usernotes` to a sharded layout under `toolbox-nxg/usernotes/*`.
2. **Config schema v2** — the config JSON format gains plain-text storage (no URI encoding), brace-token interactive fields, and stable entry IDs. The classic v1 format is still written to the `toolbox` page when 6.x compatibility is enabled.
3. **Usernote archiving** — the NXG usernote format adds an `archived` field per note, letting notes be hidden rather than deleted.

## Subreddit config

### Wiki paths

| Schema       | Wiki page     | Written by                     |
| ------------ | ------------- | ------------------------------ |
| v1 (classic) | `toolbox`     | 6.x clients; NXG compat mirror |
| v2 (NXG)     | `toolbox-nxg` | NXG clients                    |

NXG always reads and writes `toolbox-nxg`. When 6.x compatibility writes are enabled, NXG also writes a down-converted v1 copy to `toolbox` on every save.

### Migration

Migration runs automatically the first time a moderator with wiki-edit permissions views a subreddit. NXG reads the existing `toolbox` page, up-converts it to v2, and writes it to `toolbox-nxg`. The original `toolbox` page is never deleted.

Re-running migration (e.g. to fold in 6.x edits) is safe and idempotent: when a readable `toolbox-nxg` page already exists, NXG reconcile-merges the 6.x-owned fields from the legacy page into it rather than overwriting. Stable entry IDs are preserved by content-matching across the merge.

### v1 → v2 differences

**No URI encoding** — v1 stores certain fields URI-encoded (via `escape()`) because 6.x unconditionally `unescape()`s them on read. v2 stores all strings as plain text. `normalizeConfig` only URI-decodes configs with `ver < 2`, so literal percent signs in v2 text survive.

**Brace tokens instead of HTML** — v1 reason text could embed `<input>`, `<textarea>`, and `<select>` elements. v2 replaces them with brace tokens. The v1 mirror down-converts them back to HTML for 6.x compatibility. See [Brace tokens](#brace-tokens) below for the full syntax.

**Stable entry IDs** — every removal reason and mod macro in v2 carries a stable 8-character base-36 `id`. IDs are assigned on create and backfilled by `ensureStableIds` during normalization. They survive reordering and are stripped from the v1 mirror.

## Brace tokens

Brace tokens are the v2 way to embed interactive fill-in fields in removal reason text. When a moderator opens the removal overlay for a reason that contains tokens, the overlay renders a form control for each one; the mod fills in the values and the final message is assembled by substituting those values in place.

### Token types

**`{input: placeholder}`** — a single-line text field. The text between the colon and the closing brace is used as the placeholder hint shown inside the field. Example:

```
Your post has been removed. Please resubmit with {input: a descriptive title}.
```

**`{textarea: placeholder}`** — a multi-line text field, otherwise identical to `{input}`. Use this when you expect longer free-form text.

```
We have removed your post for the following reason: {textarea: explain the issue in detail}
```

**`{choice}`** — a pick-one field, shown in the overlay as a group of radio buttons. The option the mod picks is inserted into the message. Every option is both the visible label and the inserted text, and may contain markdown such as links. The first option is selected to begin with; make it blank (`-` with nothing after it) to insert nothing until a real option is picked. A choice comes in two forms.

The **block** form puts the `{choice}` marker on a line of its own, with the options as a markdown list directly below it. Use it when the choice stands on its own, for example a rule to cite under a question:

```
Which rule did your post break?

{choice}
- Rule 1: No spam
- Rule 2: Be civil
- Rule 3: Relevant content

Please review our rules before resubmitting.
```

Blank lines between the marker and the list are fine; the block is tidied to the form above on save. The list ends at the first line that isn't a list item. A marker with no list under it, or one that shares its line with other text, is not a field: it is sent as written, and the reason editor warns about it.

The **inline** form lists its options inside the token, separated by `|`, so the picked option lands exactly where the token sits in its line, for example mid-sentence or as a link's text:

```
This is a [{choice: repost | duplicate}](https://www.reddit.com/r/example/wiki/reposts) of an earlier post.
```

Write `\|` for a pipe that belongs to an option's text. A brace inside an option is saved as a parenthesis, since `}` ends the token. An inline choice with no option text, such as `{choice:}`, is sent as written.

### Stable IDs

Any interactive token may carry an optional stable id using the `#id` syntax:

```
Flight number: {input#flightnum: e.g. UA123}

{choice#rule}
- Rule 1
- Rule 2

This is a {choice#kind: repost | duplicate}.
```

The id is used to persist the entered or chosen value between overlay opens: if a mod closes and reopens the overlay without sending, the field shows what they last entered or picked. A choice without an id still keeps its pick, keyed on its position in the reason, so the pick is lost if the reason's choices are reordered.

IDs must be word characters and hyphens (`[\w-]+`). They are optional; an `{input}` or `{textarea}` without an id still works, it just won't preserve entered text across opens.

### Older v2 select definitions

Early v2 pages stored pick-one fields separately, as a `selects` array on the reason referenced from the text as `{select:name}`. Normalization folds each definition into the text as a `{choice}` block (its prompt, if any, as a line above the marker) and drops the `selects` field, so it is never written back.

### Substitution tokens

Brace tokens are distinct from **substitution tokens** — things like `{author}`, `{subreddit}`, and `{url}` that the overlay replaces automatically with context data from the removed post or comment. Substitution tokens are always a bare `{word}` with no colon, so there is no ambiguity:

| Token         | Replaced with                                    |
| ------------- | ------------------------------------------------ |
| `{author}`    | Username of the post/comment author              |
| `{subreddit}` | Name of the subreddit                            |
| `{kind}`      | `"submission"` or `"comment"`                    |
| `{title}`     | Title of the post                                |
| `{url}`       | Permalink to the removed item                    |
| `{domain}`    | Domain the post links to                         |
| `{mod}`       | Username of the moderator sending the removal    |
| `{body}`      | Body of the removed item, quoted as markdown     |
| `{fullname}`  | Reddit fullname (e.g. `t3_abc123`)               |
| `{id}`        | Short id of the removed item                     |
| `{link}`      | URL the post links to                            |
| `{raw_body}`  | Body without markdown quoting                    |
| `{uri_body}`  | URL-encoded body, for use inside markdown links  |
| `{uri_title}` | URL-encoded title, for use inside markdown links |

### Unknown brace content

Any `{…}` content that doesn't match a known interactive token or substitution token is left in the text untouched. In particular, a `{choice}` marker that has no option list, or shares its line with other text, is treated as literal text and is never substituted. This means a half-typed field fails visibly rather than silently dropping content, and the reason editor and removal overlay both warn about it before anything is sent.

### Migration from v1 HTML

During the v1 → v2 up-convert, legacy HTML form elements are translated automatically:

| v1 HTML                                   | v2 token                                         |
| ----------------------------------------- | ------------------------------------------------ |
| `<input placeholder="…">`                 | `{input: …}`                                     |
| `<textarea placeholder="…">`              | `{textarea: …}`                                  |
| `<select id="rule">…</select>` on its own | `{choice#rule}` block, one `-` line per option   |
| `<select id="rule">…</select>` in a line  | `{choice#rule: a \| b}` inline, in the same spot |
| `<br>`                                    | `\n\n` (paragraph break)                         |

A `<select>` counts as being on its own when nothing but whitespace, `<br>`, or other `<select>` elements shares its line; anything else, such as words of a sentence or the brackets of a link around it, keeps it inline so the picked option stays in its sentence. A slug-safe `id` attribute is kept as the choice's id; one that is missing or not slug-safe gives a choice without an id. An option's `value` attribute, when present, is used instead of its text, because that is what 6.x inserted. Backslash escapes that 6.x needed around link syntax in options (`\[`, `\]`, `\(`, `\)`) are removed, so links in options work as normal markdown.

The v2 → v1 down-convert reverses this: inline tokens become HTML form elements, and each choice, in either form, becomes a `<select>` in the same place, with link syntax in its options escaped again for 6.x.

#### Choices split by earlier NXG versions

Before the inline form existed, NXG turned every `<select>` into a block, including one written mid-sentence or as a link's text. The picked option was then sent as a separate paragraph, and a link around it broke. Subreddits that saved their config with one of those versions have the split text stored on both wiki pages, and the original is only left in the classic `toolbox` page's revision history.

When a moderator opens **Edit removal reasons**, NXG checks that history (up to the last 100 revisions) for reasons whose current text is exactly what the old conversion made from a historical inline `<select>`. If it finds any, it lists them and offers to restore them. Nothing changes until a moderator chooses **Restore and save**. A reason that has been edited since is never matched, so it is left alone. Each moderator's browser checks each subreddit only until the check finds nothing, or until the offer is accepted or dismissed.

## Usernotes

### Wiki paths

| Layout            | Wiki pages                                                  |
| ----------------- | ----------------------------------------------------------- |
| Classic (v6 blob) | `usernotes`                                                 |
| NXG (sharded)     | `toolbox-nxg/usernotes`, `toolbox-nxg/usernotes/<shard>`, … |

The NXG layout splits usernotes across multiple wiki pages to work around Reddit's 512 KB wiki page limit. The classic `usernotes` page had a special 1 MB allowance; that single-page limit no longer applies in the NXG layout.

### Migration

On first access, NXG decodes the classic `usernotes` blob, re-encodes it in the sharded NXG format, and writes the shards. On subsequent accesses (e.g. after 6.x edits), NXG reconcile-merges the classic page into the existing shards: new and changed notes flow in, NXG-only state (archived notes, stable indexes) is preserved.

### Archiving

The NXG format adds an `archived` field to each note entry. When a note is archived, it is hidden from the active list but retained in the shard. The `archived` object records who archived it and when.

When a 6.x mod deletes a note (by removing it from the classic `usernotes` page), NXG's reconciliation detects the deletion and archives the note with `archived.by` set to the sentinel value `[6.x]`, rendered in the UI as "archived via 6.x delete".

Archived notes are stripped from the classic page mirror — 6.x clients will not see them.

### Stable note indexes

Each note in the NXG format has a per-user `index` (assigned from `nextIndex` and never reused), making `(username, index)` an unambiguous address for a note. Notes read from the classic v6 page get ephemeral position-derived indexes on load; durable indexes are assigned when the note is first saved in the NXG layout.

## Personal settings

Personal settings (stored in browser extension storage, not the wiki) carry forward without migration. No schema bumps or key renames are required when upgrading from original Toolbox to Toolbox-NXG.
