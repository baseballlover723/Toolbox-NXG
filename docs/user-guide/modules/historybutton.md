# History Button

**Platforms:** Old Reddit and New Reddit · **Default:** Enabled

History Button adds a per-user history breakdown popup, accessible directly from a username link on any Reddit page.

## Overview

Clicking the history button next to a username opens a popup that summarizes that user's submission and comment history by domain and subreddit, along with their karma and account age. This gives moderators quick context about a user — for example, spotting an account that mostly submits one domain — without navigating away from the current page. The popup notes that this is an indication, not a complete picture.

## Features

**Submission breakdown** — tables of the domains the user has submitted from and the subreddits they have submitted to, with counts, percentages and (for subreddits) karma.

**Comment breakdown** — the subreddits the user has commented in and the domains linked in their comments and self posts. Comment history is loaded alongside submissions by default; otherwise click **comment history** to load it.

**Search links** — each domain and subreddit in the submission tables links to a Reddit search of the user's posts there. NSFW posts are left out of those searches unless you turn on **Include NSFW submissions**.

**Configurable fetch depth** — controls how many comments are retrieved per user history lookup (100–1000).

## Settings

| Setting                          | Default | Description                                                              |
| -------------------------------- | ------- | ------------------------------------------------------------------------ |
| Load comment history immediately | On      | Load comment history at the same time as submission history _(advanced)_ |
| Number of comments to retrieve   | 1000    | How many comments to fetch per history lookup _(advanced)_               |
| Include NSFW submissions         | Off     | Include NSFW posts in the Reddit searches linked from the popup          |
