/** Restores the subscriber count to old Reddit's subreddit sidebar, which Reddit stopped rendering. */

import {getSubredditAbout,} from '../../../api/resources/subreddits'
import {getCurrentSubredditName, getSidebarTitlebox,} from '../../../dom/oldReddit/page'
import {createLifecycle,} from '../../../framework/lifecycle'
import createLogger from '../../../util/infra/logging'
import {isOldReddit,} from '../../../util/infra/platform'

const log = createLogger('ModViewEnhancements',)

/** Class on the injected element; also the marker that stops a second injection. */
export const subscriberCountClass = 'toolbox-subscriber-count'

/**
 * Builds the sidebar line. It mirrors old Reddit's native markup (a `subscribers` wrapper with
 * `number`/`word` children) so it picks up the sidebar's styling and any subreddit stylesheet
 * rules that target the native count.
 */
function buildCountElement (subscribers: number,): HTMLElement {
	const wrapper = document.createElement('span',)
	wrapper.className = `subscribers ${subscriberCountClass}`
	const number = document.createElement('span',)
	number.className = 'number'
	number.textContent = subscribers.toLocaleString()
	const word = document.createElement('span',)
	word.className = 'word'
	word.textContent = subscribers === 1 ? 'subscriber' : 'subscribers'
	wrapper.append(number, ' ', word,)
	return wrapper
}

/**
 * Places the line where the native count used to sit: ahead of whatever Reddit now renders in
 * the count/online slots, falling back to just under the subscribe button or the title.
 */
function insertIntoTitlebox (titlebox: HTMLElement, element: HTMLElement,) {
	const nativeCount = titlebox.querySelector(':scope > .subscribers, :scope > .users-online',)
	if (nativeCount) {
		nativeCount.before(element,)
		return
	}
	const anchor = titlebox.querySelector(':scope > .subscribe-button',)
		?? titlebox.querySelector(':scope > h1.redditname',)
	if (anchor) {
		anchor.after(element,)
	} else {
		titlebox.prepend(element,)
	}
}

/**
 * Fetches the current subreddit's subscriber count from `about.json` and shows it in the old
 * Reddit sidebar. No-op off old Reddit, when disabled, or on pages without a subreddit titlebox.
 * @param enabled Whether the user has the subscriber-count setting on.
 * @returns An object with a `cleanup` function that removes the injected line.
 */
export function createSubscriberCountHandlers (enabled: boolean,): {cleanup: () => Promise<void>} {
	const lifecycle = createLifecycle()
	if (!enabled || !isOldReddit) {
		return {cleanup: lifecycle.cleanup,}
	}

	const titlebox = getSidebarTitlebox()
	const subreddit = getCurrentSubredditName()
	if (!titlebox || !subreddit || titlebox.querySelector(`.${subscriberCountClass}`,)) {
		return {cleanup: lifecycle.cleanup,}
	}

	let injected: HTMLElement | null = null
	let disposed = false
	lifecycle.mount(() => {
		disposed = true
		injected?.remove()
		injected = null
	},)

	void getSubredditAbout(subreddit,)
		.then(({subscribers,},) => {
			// The module may have been torn down while the request was in flight.
			if (disposed || subscribers === null) { return }
			injected = buildCountElement(subscribers,)
			insertIntoTitlebox(titlebox, injected,)
		},)
		.catch((error: unknown,) => {
			// Pseudo-subreddits like r/all have no about page; a missing count is not worth surfacing.
			log.debug(`Could not load subscriber count for r/${subreddit}`, error,)
		},)

	return {cleanup: lifecycle.cleanup,}
}
