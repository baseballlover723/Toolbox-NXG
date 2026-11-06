# Config Popup Style Guide

Reference for building tabs and components within the Toolbox config overlay (`ConfigOverlay` / `WindowTabs`).

---

## Design Tokens

All values come from the `--toolbox-*` tokens in `extension/data/css/base.css`; stylelint rejects hex and named colors, literal radii, and literal drop shadows (see the [Coding Style Guide](coding-style.md)). Use raw `rgb()` only for a value no token covers, with an `/* intentional: */` comment. Several of the recurring patterns below are also available as shared classes in `extension/data/css/Base.module.css` (`cardtitle`, `untitled`, `draghandle`, `inlineiconbutton`, `cardactions`, `rowcard`, `warning`, `secondaryitalic`, `columngaplarge`, ...), pulled in with `composes: x from "..."`.

Light-mode values are listed for reference; every color token also has a dark-mode value.

| Token                              | Light value                           | Usage                                                   |
| ---------------------------------- | ------------------------------------- | ------------------------------------------------------- |
| `--toolbox-font-family`            | Verdana, Arial, Helvetica, sans-serif | All text                                                |
| `--toolbox-header-bg`              | `rgb(206 227 248)`                    | Tab footer bar background                               |
| `--toolbox-header-button-bg`       | `rgb(199 214 230)`                    | Sidebar tab background                                  |
| `--toolbox-header-button-hover-bg` | `rgb(159 186 214)`                    | Sidebar tab hover / active                              |
| `--toolbox-input-border`           | `rgb(199 214 230)`                    | Input borders at rest                                   |
| `--toolbox-input-focus`            | `rgb(159 186 214)`                    | Input focus ring; "add" card border; placeholder text   |
| `--toolbox-border-color`           | `rgb(114 134 154)`                    | Non-primary `ActionButton` border                       |
| `--toolbox-action-bg`              | `rgb(247 250 253)`                    | Card body background; non-primary button; action grid   |
| `--toolbox-action-text`            | `rgb(23 50 78)`                       | Non-primary button text                                 |
| `--toolbox-surface-border`         | `rgb(208 220 232)`                    | Card / section borders                                  |
| `--toolbox-selected-bg`            | `rgb(234 242 250)`                    | Card header strip; "add" card background; selected item |
| `--toolbox-badge-bg`               | `rgb(232 241 250)`                    | Context badge fill                                      |
| `--toolbox-text-body`              | `rgb(70 89 109)`                      | Card titles, field labels, preview text                 |
| `--toolbox-text-secondary`         | `rgb(107 122 141)`                    | Section headers, hints, badge text                      |
| `--toolbox-accent-color`           | `rgb(59 125 180)`                     | Primary button; active icon button; expand-toggle link  |
| `--toolbox-accent-hover`           | `rgb(45 96 144)`                      | Primary button hover                                    |
| `--toolbox-accent-active`          | `rgb(34 82 126)`                      | Primary button pressed                                  |
| `--toolbox-accent-disabled`        | `rgb(122 173 208)`                    | Primary button disabled fill                            |
| `--toolbox-caution-bg`             | `rgb(255 248 230)`                    | Warning banner background                               |
| `--toolbox-caution-border`         | `rgb(232 213 160)`                    | Warning banner border                                   |
| `--toolbox-caution-accent`         | `rgb(201 162 39)`                     | Warning banner left accent                              |
| `--toolbox-caution-text`           | `rgb(107 90 30)`                      | Warning banner text                                     |
| `--toolbox-error-color`            | `rgb(192 57 43)`                      | Validation / error messages                             |
| `--toolbox-hover-overlay`          | `rgb(0 0 0 / 6%)`                     | Icon button hover tint                                  |
| `--toolbox-shadow-color`           | `rgb(160 177 193 / 40%)`              | Shadow color used by `--toolbox-shadow-sm`              |

---

## Typography

| Role               | Size              | Weight | Color                      | Notes                                                                         |
| ------------------ | ----------------- | ------ | -------------------------- | ----------------------------------------------------------------------------- |
| Section title      | `--toolbox-fs-11` | bold   | `--toolbox-text-secondary` | Uppercase, `letter-spacing: 0.05em`, border-bottom `--toolbox-surface-border` |
| Field label        | `--toolbox-fs-11` | bold   | `--toolbox-text-body`      | —                                                                             |
| Sub-group label    | `--toolbox-fs-10` | bold   | `--toolbox-text-secondary` | Uppercase, `letter-spacing: 0.04em`                                           |
| Card title         | `1em`             | bold   | `--toolbox-text-body`      | —                                                                             |
| Body / preview     | `1em`             | normal | `--toolbox-text-body`      | `line-height: 1.4`                                                            |
| Hint / description | `--toolbox-fs-11` | normal | `--toolbox-text-secondary` | Italic                                                                        |
| Empty state        | `--toolbox-fs-11` | normal | `--toolbox-input-focus`    | Italic                                                                        |
| Badge              | `--toolbox-fs-10` | bold   | `--toolbox-text-secondary` | `letter-spacing: 0.02em`                                                      |
| Link / toggle      | `--toolbox-fs-11` | normal | `--toolbox-accent-color`   | Underline on hover                                                            |

---

## Spacing

| Context                     | Value                                      |
| --------------------------- | ------------------------------------------ |
| Tab content padding         | `--toolbox-sp-5` (handled by `WindowTabs`) |
| Card list gap               | `--toolbox-sp-6`                           |
| Card header padding         | `--toolbox-sp-6` / `--toolbox-sp-8`        |
| Card body / preview padding | `--toolbox-sp-6` / `--toolbox-sp-8`        |
| Edit form padding           | `--toolbox-sp-8`                           |
| Edit form field gap         | `--toolbox-sp-10`                          |
| Field label → input gap     | `--toolbox-sp-3`                           |
| Section margin-bottom       | `--toolbox-sp-18` (0 on last child)        |
| Section title margin-bottom | `--toolbox-sp-8`                           |
| Action group grid gap       | `--toolbox-sp-8`                           |
| Edit button row gap         | `--toolbox-sp-6`                           |
| Icon button gap             | `--toolbox-sp-2`                           |

---

## Components

The snippets below follow `RemovalReasonList.module.css`, `ModMacroList.module.css`, and `RemovalSettingsTab.module.css`, with shared `Base.module.css` classes expanded inline.

### Card List

A vertically stacked list of items, used for editable lists that also support drag reordering.

```css
.root {
	display: flex;
	flex-direction: column;
	gap: var(--toolbox-sp-8);
}
.cardList {
	display: flex;
	flex-direction: column;
	gap: var(--toolbox-sp-6);
	margin-top: var(--toolbox-sp-4);
}
```

### Card (Editable)

Two zones: a header strip and a collapsible body.

```css
.card {
	border: 1px solid var(--toolbox-surface-border);
	border-radius: var(--toolbox-radius-md);
	background: var(--toolbox-action-bg);
	overflow: hidden;
}

/* "new item" variant */
.addCard {
	background: var(--toolbox-selected-bg);
	border-color: var(--toolbox-input-focus);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--toolbox-sp-6) var(--toolbox-sp-8);
	background: var(--toolbox-selected-bg);
	border-bottom: 1px solid var(--toolbox-surface-border);
	gap: var(--toolbox-sp-8);
}

.cardTitle {
	font-size: 1em;
	font-weight: bold;
	color: var(--toolbox-text-body);
	flex: 1;
	min-width: 0; /* enables text-overflow inside flex */
}

.untitled {
	color: var(--toolbox-input-focus);
	font-weight: normal;
}
```

**Card header slot order:** drag handle → title (flex: 1) → badges → actions

### Sorting

Each card header carries a drag handle (`draghandle` in `Base.module.css`: `cursor: grab` / `cursor: grabbing`, color `--toolbox-input-focus`, the `dragHandle` icon at 18px), and cards can be dragged in either view. The list uses `@dnd-kit/core` + `@dnd-kit/sortable`. A `<SortToggleButton>` in the tab footer (`shared/controls/SortToggleButton.tsx`) switches the list to a compact sort view that collapses each card to its header; the list reads that state with `useSortMode(sortRef)`. Entering sort mode closes any open editor, and leaving it saves the new order (a pending order is also saved on unmount).

For a flat single-row card without a header strip, compose `rowcard` from `Base.module.css`.

### Context Badges

Shown in the card header to indicate which contexts an item applies to.

```css
.contextBadges {
	display: flex;
	gap: var(--toolbox-sp-3);
	flex-shrink: 0;
}

.contextBadge {
	font-size: var(--toolbox-fs-10);
	font-weight: bold;
	color: var(--toolbox-text-secondary);
	background: var(--toolbox-badge-bg);
	border-radius: var(--toolbox-radius-sm);
	padding: var(--toolbox-sp-1) var(--toolbox-sp-4);
	letter-spacing: 0.02em;
}
```

### Icon Buttons (card header actions)

Small icon-only buttons for edit/delete/reorder within card headers (`inlineiconbutton` in `Base.module.css`).

```css
.iconButton {
	background: none;
	border: none;
	padding: var(--toolbox-sp-2);
	cursor: pointer;
	display: flex;
	align-items: center;
	border-radius: var(--toolbox-radius-sm);
	line-height: 1;
}
.iconButton:hover {
	background: var(--toolbox-hover-overlay);
}

/* Applied when the button represents the current "active" state (e.g. editor is open) */
.iconButtonActive {
	color: var(--toolbox-accent-color);
}
```

**Edit toggle pattern:** clicking the edit button when the editor is already open closes it. The button icon switches between `edit` and `close`, and the title between `'Edit'` and `'Close editor'`. Apply `.iconButtonActive` when open.

### Preview Area

Shown in a card body when not editing. Clamp to 3 lines by default; "Show more / Show less" toggle appears when content overflows.

```css
.previewWrap {
	padding: var(--toolbox-sp-6) var(--toolbox-sp-8);
}
.previewClamped {
	overflow: hidden;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	font-size: 1em;
	color: var(--toolbox-text-body);
	line-height: 1.4;
}
.previewFull {
	font-size: 1em;
	color: var(--toolbox-text-body);
	line-height: 1.4;
}
.expandToggle {
	font-size: var(--toolbox-fs-11);
	color: var(--toolbox-accent-color); /* underline on hover */
}
.noText {
	font-size: var(--toolbox-fs-11);
	color: var(--toolbox-input-focus);
	font-style: italic;
	padding: var(--toolbox-sp-6) var(--toolbox-sp-8);
}
```

### Edit Form (inside a card)

```css
.editForm {
	display: flex;
	flex-direction: column;
	gap: var(--toolbox-sp-10);
	padding: var(--toolbox-sp-8);
}
.editField {
	display: flex;
	flex-direction: column;
	gap: var(--toolbox-sp-3);
}

/* All inputs in a field should be full-width */
.editField input[type="text"],
.editField select,
.editField textarea {
	box-sizing: border-box;
	width: 100%;
}

.editFieldLabel {
	font-size: var(--toolbox-fs-11);
	font-weight: bold;
	color: var(--toolbox-text-body);
}
.editButtons {
	display: flex;
	gap: var(--toolbox-sp-6);
}
```

Always use `<TextInput>` (from `NormalInput.tsx`), `<TextareaInput>`, `<ActionSelect>`, and `<CheckboxInput>` from `shared/controls/` — never raw `<input>` / `<select>` / `<textarea>`.

### Action Group Grid (checkbox clusters)

Used for grouping boolean toggles (e.g. mod macro actions).

```css
.actionsGrid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: var(--toolbox-sp-8);
	padding: var(--toolbox-sp-8);
	border: 1px solid var(--toolbox-surface-border);
	border-radius: var(--toolbox-radius-sm);
	background: var(--toolbox-action-bg);
}
.actionGroup {
	display: flex;
	flex-direction: column;
	gap: var(--toolbox-sp-5);
}
.actionGroupLabel {
	font-size: var(--toolbox-fs-10);
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--toolbox-text-secondary);
	margin-bottom: var(--toolbox-sp-2);
	padding-bottom: var(--toolbox-sp-3);
	border-bottom: 1px solid var(--toolbox-surface-border);
}
```

### Section Grouping (flat-form tabs)

For tabs that present a flat form rather than a card list.

```css
.section {
	margin-bottom: var(--toolbox-sp-18);
}
.section:last-child {
	margin-bottom: 0;
}
.sectionTitle {
	font-size: var(--toolbox-fs-11);
	font-weight: bold;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--toolbox-text-secondary);
	margin-bottom: var(--toolbox-sp-8);
	padding-bottom: var(--toolbox-sp-4);
	border-bottom: 1px solid var(--toolbox-surface-border);
}
.fieldLabel {
	display: block;
	font-size: var(--toolbox-fs-11);
	font-weight: bold;
	color: var(--toolbox-text-body);
	margin-bottom: var(--toolbox-sp-3);
	margin-top: var(--toolbox-sp-10);
}
.fieldHint {
	font-size: var(--toolbox-fs-11);
	color: var(--toolbox-text-secondary);
	font-style: italic;
}
```

### Warning Banner

Used to warn about destructive / irreversible actions (`warning` in `Base.module.css`).

```css
.warning {
	background: var(--toolbox-caution-bg);
	border: 1px solid var(--toolbox-caution-border);
	border-left: 3px solid var(--toolbox-caution-accent);
	border-radius: var(--toolbox-radius-sm);
	padding: var(--toolbox-sp-6) var(--toolbox-sp-10);
	font-size: var(--toolbox-fs-11);
	color: var(--toolbox-caution-text);
}
```

### Radio Option Cards

For mutually exclusive settings choices (e.g. reply type in removal reasons).

```css
.radioOption {
	padding: var(--toolbox-sp-7) var(--toolbox-sp-10);
	border: 1px solid var(--toolbox-input-border);
	border-radius: var(--toolbox-radius-sm);
	background: var(--toolbox-action-bg);
}
.radioOption.selected {
	border-color: var(--toolbox-input-focus);
	background: var(--toolbox-selected-bg);
}
.radioLabel {
	display: flex;
	align-items: center;
	gap: var(--toolbox-sp-7);
	cursor: pointer;
	font-size: 1em;
}
/* Sub-options indented inside the selected card */
.subOptions {
	margin-top: var(--toolbox-sp-8);
	margin-left: var(--toolbox-sp-22);
	padding-top: var(--toolbox-sp-7);
	border-top: 1px solid var(--toolbox-surface-border);
}
```

---

## Footer Buttons

The tab footer (`footer:` prop on a `ConfigOverlayTab`) renders in a fixed bar below the scroll area. Rules:

- Buttons are **right-aligned** (`justify-content: flex-end` in `WindowTabs`).
- Use `<ActionButton primary>` for the primary action, plain `<ActionButton>` for secondary (cancel, reset).
- All buttons render at the same height — do not add extra padding or height overrides.
- Icons inside `ActionButton` are automatically constrained to `14px` by `ActionButton.module.css`.

**"Add new" pattern:** expose an `addRef` from the list component with `useTriggerRef`. In the footer, render `<AddNewButton>` (`modules/config/components/AddNewButton.tsx`, which handles the disabled state) rather than a raw `ActionButton`. The button is disabled while a pending new-item form is open.

**Sort toggle + add pair** (the removal reasons tab in `modules/config/dom.tsx`):

```tsx
<>
	<SortToggleButton sortRef={reasonSortMode} />
	<AddNewButton
		label="Add new removal reason"
		triggerRef={save.addRemovalReason}
		disabledRef={disabled.addRemovalReason}
	/>
</>
```

**Wiki editor footer:** use `<WikiEditorFooter>` (`modules/config/components/WikiEditorFooter.tsx`), which renders a `<TextInput inFooter>` that fills available width alongside the save button.

---

## Interaction Patterns

### `saveRef` / `addRef`

Cross-boundary imperative callbacks — a component exposes a function to its parent (`dom.tsx`) without prop-drilling React state. Both are `TriggerRef`s; wire them with `useTriggerRef` from `util/ui/hooks`, which always calls the latest handler (so a fresh closure each render is fine) and clears the ref on unmount:

```ts
useTriggerRef(saveRef, handleSave,)
useTriggerRef(addRef, () => setShowAddForm(true,),)
```

### `disabledRef`

Same pattern, but carries a state setter:

```ts
type DisabledRef = {current: ((disabled: boolean,) => void) | null}

// In the footer component (AddNewButton.tsx):
useEffect(() => {
	disabledRef.current = setDisabled
	return () => {
		disabledRef.current = null
	}
}, [disabledRef,],)

// In the list component — synced via useEffect on the controlling state:
useEffect(() => {
	disabledRef?.current?.(showAddForm,)
	if (showAddForm) { /* scroll to bottom */ }
}, [showAddForm,],)
```

### Scroll to bottom on add

After `showAddForm` flips true, walk up from the list's root ref to find the nearest scrollable ancestor and scroll it smoothly:

```ts
const el = rootRef.current
let parent = el?.parentElement
while (parent) {
	if (parent.scrollHeight > parent.clientHeight) {
		parent.scrollTo({top: parent.scrollHeight, behavior: 'smooth',},)
		break
	}
	parent = parent.parentElement
}
```

### Advanced settings

The global `advancedMode` setting gates:

- Additional tabs in `ConfigOverlay` (marked `advanced: true` on the tab definition — a section header is injected automatically before the first advanced tab).
- Advanced field sections inside individual tabs (wrap in `{advancedMode && (...)}` ).

---

## File Conventions

| File                               | Contains                                                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `modules/config/dom.tsx`           | Tab definitions. The overlay's `TriggerRef` / `DisabledRef` / `SortModeRef` objects live here.                                 |
| `modules/config/components/`       | Config-owned components: `ConfigOverlay`, `AddNewButton`, `WikiEditorFooter`, `WikiEditorTab`, and other config tabs.          |
| `modules/<owner>/components/*.tsx` | Tab content owned by a feature module (e.g. `removalreasons/components/RemovalReasonList.tsx`). Accepts refs, emits callbacks. |
| `ComponentName.module.css`         | Scoped styles for that component only. No global selectors.                                                                    |

Each new list tab needs at minimum an edit list component (drag reordering via `@dnd-kit/core` + `@dnd-kit/sortable`, sort view via `useSortMode`) and its CSS module. Follow the pattern in `RemovalReasonList.tsx`.
