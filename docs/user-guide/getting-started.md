# Getting Started

## First steps after installing

After installing Toolbox-NXG, reload any Reddit tabs you already had open. The extension activates automatically on any Reddit page.

On your first visit to a subreddit you moderate, Toolbox-NXG quietly reads your existing toolbox wiki data and sets up the NXG layout in the background. No action is required.

The persistent Modbar appears at the bottom of every Reddit page and is your main entry point to Toolbox features. From there you can open mod queues, access the subreddit config overlay, and reach the settings panel.

## The settings overlay

Open the settings overlay by clicking the gear icon (**Toolbox-NXG settings**) in the Modbar.

The overlay is divided into tabs. **Core Settings** comes first (backup and restore, advanced and debug options), followed by the always-on modules (such as General Settings, Modbar and Notifier) and **About**. The optional modules follow, grouped under **General Modules**, **Old Reddit Modules** and **Shreddit Modules**. A search box filters the tabs to settings matching what you type. Changes on any tab are kept while the overlay is open and are all saved together with the **Save Settings and Refresh Page** button in the footer.

Some settings are marked **Advanced** and are hidden by default. Reveal them with the **Show advanced settings** toggle on the **Core Settings** tab.

## Modules

Toolbox-NXG functionality is organized into modules. Each module can be individually enabled or disabled from its tab in the settings overlay. Some modules are always on (General Settings, Modbar, Notifier, Support, and the Old Reddit infrastructure module) and do not show an enable toggle.

See the [Modules](modules/index.md) section for documentation on each module.

## Reddit compatibility

Toolbox-NXG works on both old Reddit (`old.reddit.com`) and new Reddit / Shreddit (`www.reddit.com`, also served at `sh.reddit.com`). Most modules support both platforms. A handful are platform-specific — their pages note which platforms they support.

## If you're migrating from original Toolbox

See [Migrating from Toolbox](../migration/index.md) for a guide to what changed and what (if anything) you need to do.

## Targeting Toolbox-NXG from a subreddit stylesheet

The `toolbox` class on `<body>` is set by both original Toolbox and Toolbox-NXG, so selectors built on it match both. To publish a fix that only applies to Toolbox-NXG, scope it with one of these classes, which Toolbox-NXG sets on both `<html>` and `<body>` (original Toolbox sets none of them):

| Class              | Present when                            |
| ------------------ | --------------------------------------- |
| `toolbox-nxg`      | Toolbox-NXG is running (any version)    |
| `toolbox-nxg-v8`   | The major version is 8                  |
| `toolbox-nxg-v8-0` | The version is 8.0.x (major 8, minor 0) |

For example, `.toolbox-nxg .some-selector { ... }` targets Toolbox-NXG only, and `.toolbox-nxg-v8-0 .some-selector { ... }` targets only the 8.0 releases.
