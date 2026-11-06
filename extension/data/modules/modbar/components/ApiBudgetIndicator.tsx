/** Debug-mode modbar readout of the shared Reddit API budget: calls left and time until reset. */

import {useSyncExternalStore,} from 'react'

import {formatApiBudgetReset, isApiBudgetExhausted,} from '../../../api/resources/ratelimit'
import type {ApiBudgetStore,} from '../schema'
import css from './ApiBudgetIndicator.module.css'

/** Calls-left threshold below which the readout switches to the caution color. */
const lowBudgetThreshold = 10

/**
 * Shows `API <remaining> <countdown>` next to the version badge. Turns caution-colored
 * when the budget runs low and error-colored while requests are being held back.
 */
export function ApiBudgetIndicator ({store,}: {store: ApiBudgetStore},) {
	const {status, readAt,} = useSyncExternalStore(store.subscribe, store.getSnapshot,)

	if (!status) {
		return <span className={css.indicator} title="Reddit API budget unavailable">API --</span>
	}

	const exhausted = isApiBudgetExhausted(status, readAt,)
	const countdown = formatApiBudgetReset(status, readAt,)
	const remaining = status.remaining === null ? '--' : String(Math.floor(status.remaining,),)
	const level = exhausted
		? css.exhausted
		: status.remaining !== null && status.remaining < lowBudgetThreshold
		? css.low
		: ''

	const resetPart = countdown ? `; resets in ${countdown}` : ''
	const waitPart = exhausted ? '. Requests are waiting for the reset.' : ''
	const title = status.remaining === null
		? 'No Reddit API rate limit observed yet'
		: `Reddit API calls left in this window: ${remaining}${resetPart}${waitPart}`

	return (
		<span className={`${css.indicator} ${level}`} title={title}>
			API {remaining}
			{countdown && <span className={css.reset}>{countdown}</span>}
		</span>
	)
}
