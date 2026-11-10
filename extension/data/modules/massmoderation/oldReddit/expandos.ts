/**
 * Expand-all / collapse-all for old Reddit expandos that only loads each expando once.
 *
 * Old Reddit's own collapse empties the expando (`$expando.hide().empty()`) and its expand rebuilds it
 * from cached HTML, so every toggle reloads images and embeds. Collapse-all therefore hides expandos
 * itself instead of clicking Reddit's button, and expand-all simply shows those again.
 *
 * Of the expandos that still need opening, text posts are filled by Toolbox from one `/api/info.json`
 * request per 100 posts, and their buttons are then handled by Toolbox alone. Anything else (link
 * posts, media) is opened with Reddit's own button, one at a time and a second apart: Reddit leaves
 * expandos empty when they are opened in quick succession.
 */

import {getSubmissionBodiesHtml,} from '../../../api/resources/things'
import {getThingCheckbox,} from '../../../dom/oldReddit/queue'
import {getThingFullname,} from '../../../dom/oldReddit/things'
import {createLifecycle,} from '../../../framework/lifecycle'
import {massModeration,} from '../../../framework/moduleIds'
import {purifyHTML,} from '../../../util/data/purify'
import createLogger from '../../../util/infra/logging'

const log = createLogger(massModeration,)

/** Marks a thing whose expando Toolbox hid without telling Reddit; see massmoderation.css. */
export const softCollapsedClass = 'toolbox-expando-soft-collapsed'

/** Marks a text post whose expando Toolbox filled itself; Toolbox then owns its button. */
export const filledClass = 'toolbox-expando-filled'

/** Delay between expandos opened with Reddit's button. */
const clickIntervalMs = 1000

/** Most fullnames `/api/info.json` accepts in one request. */
const infoBatchSize = 100

/** Returns a thing's own expando button, if it has one. */
function getExpandoButton (thing: Element,): Element | null {
	return thing.querySelector(':scope > .entry .expando-button',)
}

/** Shows a soft-collapsed expando again and gives its button back the "expanded" look. */
function restore (thing: Element,): void {
	thing.classList.remove(softCollapsedClass,)
	getExpandoButton(thing,)?.classList.replace('collapsed', 'expanded',)
}

/** Hides an open expando without discarding its content, and gives its button the "collapsed" look. */
function softCollapse (thing: Element,): void {
	thing.classList.add(softCollapsedClass,)
	getExpandoButton(thing,)?.classList.replace('expanded', 'collapsed',)
}

/**
 * Fills a text post's expando with its body, in the markup Reddit's own expando uses, and shows it.
 * Old Reddit styles self-post text (the bordered box, paragraph spacing) through the `form.usertext`
 * wrapper, so that is rebuilt too, minus Reddit's inline edit handler.
 * @returns Whether the post had an expando to fill.
 */
function fill (thing: Element, fullname: string, selftextHtml: string,): boolean {
	const expando = thing.querySelector<HTMLElement>(':scope > .entry .expando',)
	const button = getExpandoButton(thing,)
	if (!expando || !button) { return false }
	const form = document.createElement('form',)
	form.className = 'usertext warn-on-unload'
	const thingId = document.createElement('input',)
	thingId.type = 'hidden'
	thingId.name = 'thing_id'
	thingId.value = fullname
	const body = document.createElement('div',)
	body.className = 'usertext-body may-blank-within md-container'
	body.innerHTML = purifyHTML(selftextHtml,)
	form.append(thingId, body,)
	expando.replaceChildren(form,)
	expando.classList.remove('expando-uninitialized',)
	expando.style.display = 'block'
	thing.classList.add(filledClass,)
	button.classList.replace('collapsed', 'expanded',)
	return true
}

/**
 * Creates the expand-all / collapse-all controls.
 * @returns `openAll` and `closeAll` for the toolbar, and `cleanup`, which shows any expando Toolbox hid.
 */
export function createExpandoControls () {
	const scope = createLifecycle()
	// Buttons waiting to be clicked open, one every clickIntervalMs.
	let clickQueue: HTMLElement[] = []
	let cancelClickTimer: (() => void) | null = null
	// Bumped by every expand-all and collapse-all, so a text-post fetch that comes back after the mod
	// has moved on doesn't open anything.
	let generation = 0

	/** Opens one expando with Reddit's own button. */
	function clickOpen (button: HTMLElement,): void {
		// Skip a button that's already open (e.g. the mod opened it while it waited in the queue).
		if (!button.isConnected || !button.classList.contains('collapsed',)) { return }
		button.click()
		// Clicking an expando checks the thing's checkbox on old Reddit, so re-clear it.
		const thing = button.closest('.thing',)
		const checkBox = thing ? getThingCheckbox(thing,) : null
		if (checkBox) { checkBox.checked = false }
	}

	/** Clicks the next queued button, then waits clickIntervalMs before the one after. */
	function pumpClicks (): void {
		cancelClickTimer = null
		const button = clickQueue.shift()
		if (!button) { return }
		clickOpen(button,)
		if (clickQueue.length > 0) { cancelClickTimer = scope.timeout(pumpClicks, clickIntervalMs,) }
	}

	/** Adds buttons to the click queue, starting it if it's idle. */
	function enqueueClicks (buttons: HTMLElement[],): void {
		if (buttons.length === 0) { return }
		clickQueue.push(...buttons,)
		if (!cancelClickTimer) { cancelClickTimer = scope.timeout(pumpClicks, 0,) }
	}

	function cancelPendingOpens (): void {
		clickQueue = []
		cancelClickTimer?.()
		cancelClickTimer = null
		generation += 1
	}

	/**
	 * Fetches the bodies of the given text posts and fills their expandos. Any post that can't be
	 * filled (fetch failed, post gone, no body) falls back to Reddit's button.
	 */
	async function preloadTextPosts (posts: Array<{thing: Element; button: HTMLElement; fullname: string}>,) {
		const run = generation
		const bodies = new Map<string, string>()
		try {
			for (let i = 0; i < posts.length; i += infoBatchSize) {
				const batch = posts.slice(i, i + infoBatchSize,).map(({fullname,},) => fullname)
				for (const [name, html,] of await getSubmissionBodiesHtml(batch,)) { bodies.set(name, html,) }
			}
		} catch (error) {
			log.warn('Couldn\'t load text post bodies; opening them with Reddit\'s button instead:', error,)
		}
		if (run !== generation) { return }
		const fallback: HTMLElement[] = []
		for (const {thing, button, fullname,} of posts) {
			if (!button.classList.contains('collapsed',)) { continue }
			const body = bodies.get(fullname,)
			if (!body || !fill(thing, fullname, body,)) { fallback.push(button,) }
		}
		enqueueClicks(fallback,)
	}

	/** Shows every expando: hidden ones at once, text posts from one fetch, the rest by Reddit's button. */
	function openAll (): void {
		cancelPendingOpens()
		document.querySelectorAll(`.thing.${softCollapsedClass}`,).forEach(restore,)
		const textPosts: Array<{thing: Element; button: HTMLElement; fullname: string}> = []
		const others: HTMLElement[] = []
		document.querySelectorAll<HTMLElement>('.expando-button.collapsed',).forEach((button,) => {
			const thing = button.closest('.thing',)
			const fullname = thing ? getThingFullname(thing,) : null
			if (thing && fullname && thing.matches('.link.self',)) {
				textPosts.push({thing, button, fullname,},)
			} else {
				others.push(button,)
			}
		},)
		enqueueClicks(others,)
		if (textPosts.length > 0) { void preloadTextPosts(textPosts,) }
	}

	/** Hides every open expando without discarding its loaded content. */
	function closeAll (): void {
		cancelPendingOpens()
		document.querySelectorAll('.expando-button.expanded',).forEach((button,) => {
			const thing = button.closest('.thing',)
			if (thing) { softCollapse(thing,) }
		},)
	}

	// Capture phase, so this runs before Reddit's handler on the thing.
	// - A soft-collapsed expando: Reddit still thinks it's open, so letting the click through would make
	//   Reddit "collapse" it (and empty it). Show it ourselves instead.
	// - An expando Toolbox filled: Reddit doesn't know it's open at all, so Toolbox toggles it.
	scope.on(document, 'click', (event: MouseEvent,) => {
		if (!(event.target instanceof Element)) { return }
		const thing = event.target.closest('.expando-button',)?.closest('.thing',)
		if (!thing) { return }
		if (thing.classList.contains(softCollapsedClass,)) {
			event.preventDefault()
			event.stopImmediatePropagation()
			restore(thing,)
		} else if (thing.classList.contains(filledClass,)) {
			event.preventDefault()
			event.stopImmediatePropagation()
			softCollapse(thing,)
		}
	}, true,)

	scope.mount(() => {
		document.querySelectorAll(`.thing.${softCollapsedClass}`,).forEach(restore,)
	},)

	return {openAll, closeAll, cleanup: scope.cleanup,}
}
