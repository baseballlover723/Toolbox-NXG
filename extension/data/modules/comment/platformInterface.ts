/** Platform interface and old-Reddit binding for the Comments module's DOM operations. */
import {
	getActionReasonElements,
	getModeratorActionElements,
	getOldCommentThings,
	getSpammedCommentEntries,
	getUncheckedCommentThings,
} from '../../dom/oldReddit/comments'
import {
	getEntry,
	getThingApproveButton,
	getThingBigModButtons,
	getThingFromDescendant,
	getThingRemovedInput,
} from '../../dom/oldReddit/things'

/**
 * Platform-agnostic interface consumed by the Comments module's feature handlers.
 * Implementations bind abstract operations to concrete DOM manipulations for each Reddit platform.
 */
export interface CommentModuleAdapter {
	/** CSS selector matching old-collapsed comment things; used for lifecycle delegation. */
	oldExpandSelector: string
	/** CSS selector matching the per-comment "hide" control on a revealed seen comment. */
	rehideOldSelector: string

	// --- spamToggle ---

	/** Returns all comment entry elements that are currently marked as spam/removed. */
	getSpammedCommentEntries(): Element[]
	/** Marks a comment entry element as spam so it can be targeted by visibility toggling. */
	markEntryAsSpam(entry: Element,): void
	/** Returns comment thing elements that have not yet been processed by the spam-toggle run. */
	getUncheckedCommentThings(): Element[]
	/** Marks a thing as processed so it won't be re-scanned on the next run. */
	markThingChecked(thing: Element,): void
	/** Returns action-reason elements whose visibility is toggled along with removed comments. */
	getActionReasonElements(): HTMLElement[]
	/**
	 * Returns the DOM anchor where an approve button should be inserted, or null if one already exists.
	 * @param thing The comment thing element.
	 */
	getApproveAnchor(thing: Element,): Element | null
	/**
	 * Returns the DOM anchor where a spam button should be inserted, or null if one already exists.
	 * @param thing The comment thing element.
	 */
	getSpamButtonAnchor(thing: Element,): Element | null
	/**
	 * Returns the DOM anchor where a ham/remove button should be inserted, or null if one already exists.
	 * @param thing The comment thing element.
	 */
	getHamButtonAnchor(thing: Element,): Element | null
	/**
	 * Creates and inserts an action button (approve/spam/remove) adjacent to the given anchor.
	 * @param anchor The reference element to insert relative to.
	 * @param position Where to insert relative to the anchor.
	 * @param config Button class, visible label, and thing fullname stored as a data attribute.
	 */
	insertActionButton(
		anchor: Element,
		position: InsertPosition,
		config: {className: string; text: string; fullname: string},
	): void
	/** Returns all comment entry elements currently marked as spam via `markEntryAsSpam`. */
	getMarkedSpamEntries(): HTMLElement[]
	/**
	 * Shows or hides an element.
	 * @param el The element to affect.
	 * @param visible Whether the element should be visible.
	 */
	setElementVisible(el: HTMLElement, visible: boolean,): void

	// --- hideOldComments ---

	/** Returns comment thing elements that are considered "old" (already seen by the user). */
	getOldCommentThings(): Element[]
	/**
	 * Returns the entry element for a comment thing, used as the visibility toggle target.
	 * @param thing The comment thing element.
	 */
	getCommentEntry(thing: Element,): HTMLElement | null
	/**
	 * Adds or removes the collapsed-old marker class on a thing.
	 * @param thing The comment thing element.
	 * @param collapsed True to mark as old-collapsed, false to unmark.
	 */
	markThingOldCollapsed(thing: Element, collapsed: boolean,): void
	/**
	 * Fully expands a collapsed-old thing, restoring all direct children's visibility.
	 * @param thing The comment thing element to expand.
	 */
	expandOldThing(thing: Element,): void
	/** Resets all comment visibility state, undoing any hide-old-comments operation. */
	resetAllCommentVisibility(): void
	/**
	 * Returns the comment thing an element belongs to directly (its nearest thing), so a click
	 * inside a reply is not attributed to the reply's ancestors.
	 * @param element Any element inside a comment.
	 */
	getOwningThing(element: Element,): Element | null
	/**
	 * Adds a "hide" control to a revealed seen comment's tagline (once), so it can be hidden again.
	 * @param thing The comment thing element that was just expanded.
	 */
	addRehideOldControl(thing: Element,): void

	// --- hideModComments ---

	/** Returns elements that represent moderator action comments on the page. */
	getModeratorActionElements(): Element[]
	/**
	 * Returns the comment container that wraps a given mod-action element.
	 * @param action A moderator action element.
	 */
	getCommentContainerForAction(action: Element,): HTMLElement | null
	/**
	 * Hides the given comment container from view.
	 * @param container The container element to hide.
	 */
	hideCommentContainer(container: HTMLElement,): void
}

/** Returns the old-Reddit binding for `CommentModuleAdapter`. */
export function createOldRedditCommentAdapter (): CommentModuleAdapter {
	return {
		oldExpandSelector: '.old-expand',
		rehideOldSelector: '.toolbox-rehide-old',

		getSpammedCommentEntries () {
			return getSpammedCommentEntries()
		},

		markEntryAsSpam (entry,) {
			entry.classList.add('toolbox-comment-spam',)
		},

		getUncheckedCommentThings () {
			return getUncheckedCommentThings()
		},

		markThingChecked (thing,) {
			thing.classList.add('toolbox-comments-checked',)
		},

		getActionReasonElements () {
			return getActionReasonElements()
		},

		getApproveAnchor (thing,) {
			if (getThingApproveButton(thing,)) { return null }
			return getThingRemovedInput(thing,)?.closest('li',) ?? null
		},

		getSpamButtonAnchor (thing,) {
			const bb = getThingBigModButtons(thing,)
			if (!bb || bb.querySelector('.negative',)) { return null }
			return bb
		},

		getHamButtonAnchor (thing,) {
			const bb = getThingBigModButtons(thing,)
			if (!bb || bb.querySelector('.neutral',)) { return null }
			return bb
		},

		insertActionButton (anchor, position, {className, text, fullname,},) {
			const li = document.createElement('li',)
			li.className = 'toolbox-replacement'
			const a = document.createElement('a',)
			a.className = className
			a.dataset.fullname = fullname
			a.textContent = text
			li.appendChild(a,)
			anchor.insertAdjacentElement(position, li,)
		},

		getMarkedSpamEntries () {
			return Array.from(document.querySelectorAll<HTMLElement>('.toolbox-comment-spam',),)
		},

		setElementVisible (el, visible,) {
			el.style.display = visible ? '' : 'none'
		},

		getOldCommentThings () {
			return getOldCommentThings()
		},

		getCommentEntry (thing,) {
			return getEntry(thing,) as HTMLElement | null
		},

		markThingOldCollapsed (thing, collapsed,) {
			thing.classList.toggle('old-expand', collapsed,)
		},

		expandOldThing (thing,) {
			thing.classList.remove('old-expand',)
			thing.querySelectorAll<HTMLElement>(':scope > *',).forEach((child,) => {
				child.style.display = ''
			},)
		},

		resetAllCommentVisibility () {
			document.querySelectorAll<HTMLElement>('.entry',).forEach((el,) => {
				el.style.display = ''
			},)
			document.querySelectorAll('.old-expand',).forEach((el,) => {
				el.classList.remove('old-expand',)
			},)
			document.querySelectorAll('.toolbox-rehide-old',).forEach((el,) => el.remove())
		},

		getOwningThing (element,) {
			return getThingFromDescendant(element,)
		},

		addRehideOldControl (thing,) {
			const tagline = getEntry(thing,)?.querySelector('.tagline',)
			if (!tagline || tagline.querySelector(':scope > .toolbox-rehide-old',)) { return }
			const link = document.createElement('a',)
			link.className = 'toolbox-rehide-old'
			link.title = 'Hide this seen comment again (its replies stay visible)'
			link.textContent = 'hide'
			tagline.append(' ', link,)
		},

		getModeratorActionElements () {
			return getModeratorActionElements()
		},

		getCommentContainerForAction (action,) {
			return getThingFromDescendant(action,) as HTMLElement | null
		},

		hideCommentContainer (container,) {
			container.style.setProperty('display', 'none',)
		},
	}
}

// NOTE: createShredditCommentPlatformInterface() is deferred pending browser-side DOM research on
// Shreddit comment structure. Key unknowns: spam/removed state signal (attribute vs
// mod-action-button), approve/spam/ham button injection point, hide mechanism, old-comment
// detection, and mod-action comment identification.
// What is already determinable when that research is done:
//
//   getSpammedCommentEntries: shreddit-comment[removed="true"] or similar
//   markEntryAsSpam:          el.setAttribute('data-tb-spam', '')
//   getModeratorActionElements: shreddit-comment with mod-action-button pattern (TBD)
//   getCommentEntry:          may be the shreddit-comment element itself
//   oldExpandSelector:        attribute-based selector (TBD)
