/**
 * Typed helpers for page-level navigation and layout elements in old Reddit's DOM.
 *
 * All functions return `null` (or an empty array) when expected markup is
 * absent rather than throwing, so callers can skip the enhancement gracefully.
 */

/** Returns the `#siteTable` element, or `null`. */
export function getSiteTable (): Element | null {
	return document.querySelector('#siteTable',)
}

/** Returns the `p#noresults` element shown when a queue is empty, or `null`. */
export function getQueueEmptyMessage (): Element | null {
	return document.querySelector('p#noresults',)
}

/** Returns the `.tabmenu` navigation element, or `null`. */
export function getQueueTabMenu (): Element | null {
	return document.querySelector('.tabmenu',)
}

/** Returns the current subreddit name from the sidebar titlebox, or `null`. */
export function getCurrentSubredditName (): string | null {
	return document.querySelector('.side .titlebox h1.redditname a',)?.textContent?.trim() ?? null
}

/** Returns the sidebar `.side .titlebox` element shown on subreddit pages, or `null`. */
export function getSidebarTitlebox (): HTMLElement | null {
	return document.querySelector<HTMLElement>('.side .titlebox',)
}

/** Returns the page-level `.menuarea` element, or `null`. */
export function getMenuarea (): Element | null {
	return document.querySelector('.menuarea',)
}

/** Returns the `div.content` page container, or `null`. */
export function getContentContainer (): Element | null {
	return document.querySelector('div.content',)
}

/** Returns all things inside `div.content` not yet seen (missing `.toolbox-seen` class). */
export function getUnseenContentThings (): Element[] {
	return Array.from(document.querySelectorAll('div.content .thing:not(.toolbox-seen)',),)
}

/** Returns the `.content .menuarea` element, or `null`. */
export function getContentMenuarea (): Element | null {
	return document.querySelector('.content .menuarea',)
}

/** Returns all `.content > .nextprev` pagination elements. */
export function getContentNextPrevLinks (): HTMLElement[] {
	return Array.from(document.querySelectorAll<HTMLElement>('.content > .nextprev',),)
}

/**
 * Returns all `.sitetable.nestedlisting>.comment>.entry .buttons .toggle` elements
 * (distinguish toggles on top-level comments in a thread).
 */
export function getNestedCommentDistinguishToggles (): Element[] {
	return Array.from(
		document.querySelectorAll('.sitetable.nestedlisting>.comment>.entry .buttons .toggle',),
	)
}

/**
 * The old Reddit header elements RES can pin to the top of the viewport (Appearance ->
 * betterReddit -> pinHeader): the subreddit bar, the user bar, or the whole header.
 */
const pinnableHeaderSelectors = ['#sr-header-area', '#header-bottom-right', '#header',]

/**
 * Returns how far down the viewport a pinned header reaches, in pixels: the bottom edge of
 * the lowest header element that is fixed to the top of the viewport, or 0 when none is.
 * Measured rather than inferred from RES's `pinHeader-*` classes, so every pin mode (and a
 * header whose height changes) is covered, and a pinned header RES has scrolled out of view
 * doesn't count.
 */
export function getPinnedHeaderBottom (): number {
	let bottom = 0
	for (const selector of pinnableHeaderSelectors) {
		const element = document.querySelector(selector,)
		if (!element || getComputedStyle(element,).position !== 'fixed') { continue }
		const rect = element.getBoundingClientRect()
		// Only a header docked at the top edge pushes content down; allow a pixel of rounding.
		if (rect.top <= 1 && rect.bottom > 0) { bottom = Math.max(bottom, rect.bottom,) }
	}
	return bottom
}
