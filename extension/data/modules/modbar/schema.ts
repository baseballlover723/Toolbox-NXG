/** Shared types for the Modbar module. */

import type {ApiBudgetStatus,} from '../../api/resources/ratelimit'

/** Snapshot consumed by the API budget readout: the budget plus the time it was read, so the countdown is stable per render. */
export interface ApiBudgetSnapshot {
	/** Latest budget, or `null` before the first reply or when the background is unreachable. */
	status: ApiBudgetStatus | null
	/** Time (ms) the snapshot was taken. */
	readAt: number
}

/** External-store handle for the API budget readout, shaped for `useSyncExternalStore`. */
export interface ApiBudgetStore {
	/** Registers a change listener; returns its unsubscribe function. */
	subscribe: (listener: () => void,) => () => void
	/** Returns the current snapshot (stable between changes). */
	getSnapshot: () => ApiBudgetSnapshot
}
