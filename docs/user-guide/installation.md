# Installation

## Browser support

Toolbox-NXG runs on Chromium-based browsers (Chrome, Edge, Brave, etc.) and Firefox (version 153 or newer).

## Installing on Chrome (and other Chromium browsers)

Install Toolbox-NXG from the Chrome Web Store:

[**Moderator Toolbox-NXG for Reddit** on the Chrome Web Store](https://chromewebstore.google.com/detail/moderator-toolbox-nxg-for/kglcfhgacmfabofjhbjlonpihkhonmkh)

The same listing works on other Chromium-based browsers such as Microsoft Edge and Brave.
Updates are delivered automatically by the browser.

## Installing on Firefox

Install Toolbox-NXG from Firefox Add-ons (AMO):

[**Moderator Toolbox-NXG for Reddit** on Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/toolbox-nxg/)

Updates are delivered automatically by the browser.

## Loading a build from source (advanced)

You can also build Toolbox-NXG yourself and load it unpacked — useful for testing a specific
commit. Building requires Node.js 24 or newer; see [Building and Testing](../developer/building.md)
for the full instructions. `npm install` followed by `npm run build` writes the extension to
`build/chrome/` and `build/firefox/`.

### Chromium

1. Go to `chrome://extensions` (or `edge://extensions`, etc.).
2. Enable "Developer mode".
3. Click "Load unpacked" and select the `build/chrome` directory.

### Firefox

1. Go to `about:debugging`.
2. Click "This Firefox" in the sidebar.
3. Click "Load Temporary Add-on..." and select `build/firefox/manifest.json`.

Firefox removes a temporary add-on when the browser restarts.

## Updating

Builds installed from the Chrome Web Store or Firefox Add-ons update themselves automatically.
Builds loaded from source do not — to update one of those, pull the latest code, rebuild, and
reload the extension (or load the temporary add-on again in Firefox).
