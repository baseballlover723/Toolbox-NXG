/** Opens new Reddit's header modmail button in a new tab when the Modmail "open in a new tab" setting is on. */

import {modmail,} from '../../../framework/moduleIds'
import store from '../../../store'

/** Whether a URL points at the modmail app (`/mail/...`, or the older `/mod/mail/...`) on reddit.com. */
export function isModmailUrl (href: string,): boolean {
	let url: URL
	try {
		url = new URL(href, 'https://www.reddit.com',)
	} catch {
		return false
	}
	if (url.hostname !== 'reddit.com' && !url.hostname.endsWith('.reddit.com',)) { return false }
	return /^\/(mod\/)?mail(\/|$)/.test(url.pathname,)
}

/**
 * Finds the modmail link a click landed on, if it sits inside the page header. Reads the
 * event's composed path rather than `event.target` because new Reddit renders its header
 * inside web components whose shadow DOM retargets `target` to the outer host element.
 * Modmail links elsewhere (in post bodies, comments, the modmail app itself) are ignored.
 * @param path The event's `composedPath()`, innermost first.
 * @returns The link's URL, or null when the click was not on a header modmail link.
 */
export function headerModmailHref (path: readonly EventTarget[],): string | null {
	const linkIndex = path.findIndex((node,) => node instanceof HTMLAnchorElement)
	if (linkIndex === -1) { return null }
	const href = (path[linkIndex] as HTMLAnchorElement).href
	if (!href || !isModmailUrl(href,)) { return null }
	const inHeader = path.slice(linkIndex + 1,).some((node,) =>
		node instanceof Element && (node.tagName === 'HEADER' || node.tagName.startsWith('REDDIT-HEADER',))
	)
	return inHeader ? href : null
}

/**
 * Creates the window click handler. Wire it with `lifecycle.on(window, 'click', handleClick, true)`
 * in `index.ts`: the capture phase runs before new Reddit's own client-side navigation handlers.
 * The setting is read live from the settings store, so toggling it applies without a reload.
 */
export function createHeaderModmailNewTabHandlers () {
	return {
		handleClick (event: MouseEvent,) {
			// Leave modified and non-primary clicks to the browser: they already choose a tab or window.
			if (event.defaultPrevented || event.button !== 0) { return }
			if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) { return }
			const values = store.getState().settings.values
			// Defaults must match the Modmail module (`enabledByDefault: true`) and its setting.
			if ((values[`Toolbox.${modmail}.enabled`] ?? true) === false) { return }
			if (values[`Toolbox.${modmail}.openInNewTab`] !== true) { return }
			const href = headerModmailHref(event.composedPath(),)
			if (!href) { return }
			event.preventDefault()
			event.stopPropagation()
			window.open(href, '_blank', 'noopener',)
		},
	}
}
