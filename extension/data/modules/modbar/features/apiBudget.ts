/** Polls the shared Reddit API budget for the modbar's debug-mode readout. */

import {getApiBudgetStatus,} from '../../../api/resources/ratelimit'
import {createLifecycle,} from '../../../framework/lifecycle'
import type {ApiBudgetSnapshot, ApiBudgetStore,} from '../schema'

/** How often the readout re-reads the budget; 1s keeps the reset countdown ticking. */
const pollMs = 1000

/**
 * Starts polling the background for the API budget. Polling a background message is
 * free (no network), and this only runs when debug mode is on.
 * @returns The store for the readout and a cleanup that stops polling.
 */
export function createApiBudgetHandlers (): {store: ApiBudgetStore; cleanup: () => Promise<void>} {
	const scope = createLifecycle()
	const listeners = new Set<() => void>()
	let snapshot: ApiBudgetSnapshot = {status: null, readAt: Date.now(),}
	let stopped = false

	scope.mount(() => {
		stopped = true
		listeners.clear()
	},)

	async function refresh () {
		const status = await getApiBudgetStatus()
		if (stopped) { return }
		snapshot = {status, readAt: Date.now(),}
		for (const listener of listeners) { listener() }
	}

	void refresh()
	scope.interval(() => void refresh(), pollMs,)

	return {
		store: {
			subscribe (listener,) {
				listeners.add(listener,)
				return () => listeners.delete(listener,)
			},
			getSnapshot: () => snapshot,
		},
		cleanup: scope.cleanup,
	}
}
