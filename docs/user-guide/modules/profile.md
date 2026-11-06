# Profile Pro

**Platforms:** Old Reddit and New Reddit · **Default:** Enabled

Profile Pro provides an in-page user profile overlay with the user's post and comment history, search and filtering tools, and other moderator-relevant information about a user.

## Overview

Clicking the profile button next to a username (or visiting a user profile page, when **Always open Toolbox profile on profile pages** is on) opens the Profile Pro overlay. It brings the user's overview, submissions and comments together with account details into a single panel — giving moderators the context they need without navigating to multiple pages.

## Features

**Profile button next to usernames** — a small button next to any username opens the Profile Pro overlay for that user.

**Overview, submitted and comments tabs** — browse the user's history from within the overlay.

**Search** — search the user's history by subreddit and content (including regular expressions).

**Filters** — **Hide unmoddable** hides posts and comments from subreddits where you are not a moderator; **Hide mod actions** hides items where the user was distinguished as a moderator.

**Highlight reposts** — fetches the user's full history and highlights reposted links and duplicated text. Clicking a Repost badge shows only that group.

**Remove all from a subreddit** — after searching a subreddit you moderate, remove all of the user's content there in one step, with a confirmation and progress panel. Not available to trainees in [training mode](proposals.md), since bulk actions cannot be proposed.

**User sidebar** — shows the account's details (such as its age), the subreddits it moderates, and its trophies.

**Legacy profile redirect** — optionally send profile link clicks to the user's legacy overview page (`/user/<name>/overview`).

**Subreddit color borders** — when Mod View Enhancements' subreddit color setting is enabled, the profile overlay can display the same colors.

## Settings

| Setting                                      | Default | Description                                                 |
| -------------------------------------------- | ------- | ----------------------------------------------------------- |
| Always open Toolbox profile on profile pages | Off     | Replace the Reddit profile page with the Toolbox overlay    |
| Show profile button next to usernames        | On      | Show the profile button inline next to usernames            |
| Open profile links in legacy Reddit          | Off     | Send profile link clicks to the user's legacy overview page |
