# Mass Moderation

**Platforms:** Old Reddit only · **Default:** Enabled

Mass Moderation adds queue management tools to old Reddit moderation pages, letting moderators sort, filter, and act on multiple queue items at once.

## Overview

Mass Moderation is an old Reddit-only module. It activates on mod queue and unmoderated pages and adds a toolbar of controls above the listing. Items can be sorted and filtered without reloading, and auto-refresh keeps the queue up to date.

The toolbar stays pinned to the top of the window as you scroll. If RES pins the subreddit bar, user bar or header (Appearance → betterReddit), the toolbar sits just below it instead of being covered.

## Features

**Sort and filter** — sort queue items by age, edited time, removal time, score, report count, or author username. Items with fewer reports than the reports threshold, or a score above the score threshold, can be hidden.

**Hide actioned items** — removes items from the listing after you take action on them, so the queue shrinks as you work through it.

**Items handled elsewhere** — when the mod log shows an item was approved or removed by another moderator (or by you on another page), the queue recolors it, labels its button "Approved by …" or "Removed by …", unticks it, and fades it. That includes an item another mod handled just before the queue finished loading. These items are never hidden automatically, since that would shift the page under your cursor: click **hide handled** in the toolbar to clear them all at once, and **unhide all** to bring them back. The mod log is checked after each of your own actions and on every auto-refresh tick.

**Group by subreddit** — groups queue items from the same subreddit together.

**Group comments by submission** — when viewing a comment queue, groups each comment under its parent submission.

**Auto-refresh** — periodically reloads queue items so new reports appear without a manual page refresh. It checks often while things are changing and backs off when they aren't, pauses while the tab is in the background, and checks straight away when you return to it.

**Expand reports** — automatically expands the report details for every item when the page loads.

**Link to subreddit queue** — adds a link to each item's subreddit mod queue for quick drill-down.

**Expand or collapse all** — the toolbar's **expand all** button opens every expando box on the page. Text posts load together in a single request; link and media posts open one per second, because Reddit leaves them empty when they're opened faster. **collapse all** hides them without discarding what's loaded, so expanding them again is instant and doesn't reload images or embeds.

**Keep expandos open** — opens all expando boxes on queue pages by default.

## Settings

| Setting                      | Default | Description                                                                                    |
| ---------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| Automatically activate       | On      | Activate mass moderation tools on queue pages automatically                                    |
| Expand reports               | Off     | Auto-expand reports on mod pages                                                               |
| Hide actioned items          | Off     | Hide items after taking a mod action                                                           |
| Link to subreddit queue      | Off     | Show link to the subreddit queue on mod pages                                                  |
| Sort by                      | Age     | Default sort order for queue items (age, edited, removed, score, reports, author) _(advanced)_ |
| Reports threshold            | 0       | Hide items with fewer reports than this (0 = show all) _(advanced)_                            |
| Sort ascending               | Off     | Sort in ascending order _(advanced)_                                                           |
| Group comments by submission | Off     | Group comment-queue items by their parent post _(advanced)_                                    |
| Keep expandos open           | Off     | Keep all media expandos open by default _(advanced)_                                           |
| Score threshold              | 0       | Hide items with score above this value (0 = disabled) _(advanced)_                             |
| Prevent re-sort on load      | Off     | Lock the current sort when new items load _(advanced)_                                         |
| Group by subreddit           | Off     | Group queue items by subreddit _(advanced)_                                                    |
| Auto-refresh                 | Off     | Auto-refresh queue items periodically _(advanced)_                                             |
