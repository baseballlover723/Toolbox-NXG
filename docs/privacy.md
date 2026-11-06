# Privacy Policy

Toolbox has access to the same information on reddit as the account(s) with which you use it.

The toolbox development team highly values privacy. These are the measures we have taken in order to protect the privacy of people using toolbox:

- Toolbox purposely lacks the technical means to send any data back to the toolbox development team.[^1]
- Any data accessed is used for toolbox functionality only.
- If accessed data needs to be stored it is either stored on reddit (usernotes, toolbox subreddit configuration, settings export) or in the local browser extension settings (personal settings, cache). No data is stored outside of reddit or out of reach of the person using toolbox.
- Data stored on reddit is stored through wiki pages. It is only stored in wiki pages of subreddits where the account using toolbox has access as moderator with the permissions to edit those pages. Any write action on a wiki page is accompanied with a settings change on the wiki page that makes sure only moderators have access to the written data.

[^1]: Toolbox is open-source — you can check the code and the declared webextension permissions in the repository. The releases on the Chrome Web Store and Mozilla AMO are built from this public source code by the published build process: the code is bundled and minified, but nothing is added or removed. Here is how to access the code of the installed version to verify this:

    - **Edge**: Open `edge://version/` and look for `Profile path` — that directory contains extensions.
    - **Chrome**: Open `chrome://version/` and look for `Profile Path` — that directory contains extensions.
    - **Firefox**: Navigate to [your profile directory](https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data) and then to the `extensions` subdirectory. You'll find `adhesivecheese@toolbox-team-nxg.xpi`, which can be opened as a zip file.
