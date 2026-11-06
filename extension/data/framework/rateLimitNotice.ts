/** Startup notice explaining that Toolbox is waiting out a spent Reddit API rate limit before it loads. */

import {formatApiBudgetReset, getApiBudgetStatus, isApiBudgetExhausted,} from '../api/resources/ratelimit'
import {createLifecycle,} from './lifecycle'

/** How often the notice re-reads the budget while startup is pending. */
const pollMs = 1000

/**
 * Builds the notice text for a spent budget.
 * @param countdown `m:ss` until reset, or `null` when unknown.
 */
export function rateLimitNoticeText (countdown: string | null,): string {
	return countdown
		? `Reddit API rate limit reached. Toolbox-NXG will finish loading in ${countdown}.`
		: 'Reddit API rate limit reached. Toolbox-NXG will finish loading shortly.'
}

/**
 * Watches the shared API budget while startup is pending. Startup waits on API calls
 * (and modules would be non-functional without them), so instead of loading early we
 * explain the delay. The notice is plain DOM with no API calls or React, since neither
 * the React root nor the toast system exists yet. It polls rather than checking once
 * because the budget can run out mid-startup (e.g. a 429 on the first request).
 * @returns A cleanup function; call it once startup finishes or aborts to stop polling
 * and remove the notice.
 */
export function createRateLimitNotice (): () => Promise<void> {
	const scope = createLifecycle()
	let notice: HTMLElement | null = null
	let stopped = false

	scope.mount(() => {
		stopped = true
		notice?.remove()
		notice = null
	},)

	async function refresh () {
		const status = await getApiBudgetStatus()
		if (stopped) { return }
		const now = Date.now()
		if (!status || !isApiBudgetExhausted(status, now,)) {
			notice?.remove()
			notice = null
			return
		}
		if (!notice) {
			// Content scripts run at document_end, but the body can still be absent on
			// unusual documents; try again on the next tick.
			if (!document.body) { return }
			notice = document.createElement('div',)
			notice.className = 'toolbox-ratelimit-notice'
			notice.setAttribute('role', 'status',)
			document.body.append(notice,)
		}
		notice.textContent = rateLimitNoticeText(formatApiBudgetReset(status, now,),)
	}

	void refresh()
	scope.interval(() => void refresh(), pollMs,)

	return scope.cleanup
}
