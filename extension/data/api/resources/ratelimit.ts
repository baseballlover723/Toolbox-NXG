/** Read-only access to the background's shared Reddit API rate-limit budget, for status displays. */

import browser from 'webextension-polyfill'

import type {TbRatelimitStatusMessage, TbRatelimitStatusResponse,} from '../../background/messages'

/** Snapshot of the shared API budget, as seen by every tab. */
export interface ApiBudgetStatus {
	/** Calls left in the current window, or `null` when no limit has been observed yet. */
	remaining: number | null
	/** Absolute ms timestamp at which the current window resets; `0` when unknown. */
	resetAt: number
}

/** Narrows an untyped message reply to a status object. */
function isStatusResponse (value: unknown,): value is TbRatelimitStatusResponse {
	if (value == null || typeof value !== 'object' || !('remaining' in value) || !('resetAt' in value)) {
		return false
	}
	return (value.remaining === null || typeof value.remaining === 'number') && typeof value.resetAt === 'number'
}

/**
 * Asks the background for the current budget. Never touches the network, so it
 * answers immediately even while the budget is spent. Resolves `null` when the
 * background can't be reached or replies with something unexpected.
 */
export async function getApiBudgetStatus (): Promise<ApiBudgetStatus | null> {
	try {
		const reply: unknown = await browser.runtime.sendMessage(
			{action: 'toolbox-ratelimit-status',} satisfies TbRatelimitStatusMessage,
		)
		return isStatusResponse(reply,) ? {remaining: reply.remaining, resetAt: reply.resetAt,} : null
	} catch {
		return null
	}
}

/**
 * Returns `true` when requests are currently being held back: no calls left and
 * the reset is still in the future. A spent budget whose reset has passed is not
 * exhausted - the next request goes straight through and refreshes the numbers.
 * @param status Budget snapshot from {@link getApiBudgetStatus}.
 * @param now Current time in ms (injectable for tests).
 */
export function isApiBudgetExhausted (status: ApiBudgetStatus, now = Date.now(),): boolean {
	return status.remaining !== null && status.remaining < 1 && status.resetAt > now
}

/**
 * Formats the time until the budget resets as `m:ss`, or `null` when the reset
 * time is unknown or already passed.
 * @param status Budget snapshot from {@link getApiBudgetStatus}.
 * @param now Current time in ms (injectable for tests).
 */
export function formatApiBudgetReset (status: ApiBudgetStatus, now = Date.now(),): string | null {
	const ms = status.resetAt - now
	if (status.resetAt === 0 || ms <= 0) { return null }
	const totalSeconds = Math.ceil(ms / 1000,)
	const minutes = Math.floor(totalSeconds / 60,)
	const seconds = totalSeconds % 60
	return `${minutes}:${String(seconds,).padStart(2, '0',)}`
}
