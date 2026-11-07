/** Data access for the Native Mod Log module: batched lookup of each user's latest native mod log entry. */

import {getRecentModNotes,} from '../../api/resources/modnotes'
import type {ModNote, PendingNoteRequest,} from '../shared/modnotes/schema'
import {type EntryVisibility, isEntryVisible,} from './schema'

/** Most users/subreddit pairs Reddit's recent-notes endpoint accepts in one call. */
const maxBatchSize = 500

/** How long to wait for more lookups before sending a batch, in milliseconds. */
const batchDelayMs = 500

/**
 * Creates a debounced fetcher for the latest native mod log entry on a user in a
 * subreddit. Concurrent lookups are batched into one API call (up to 500 pairs).
 * An entry the moderator has chosen to hide resolves to `null`; the endpoint only
 * returns the single latest entry, so there is no older entry to fall back to.
 * @param visibility Which kinds of entry to return.
 */
export function createLatestEntryFetcher (
	visibility: EntryVisibility,
): (subreddit: string, user: string,) => Promise<ModNote | null> {
	let pendingRequests: PendingNoteRequest[] = []
	let flushTimeout: ReturnType<typeof setTimeout> | null = null

	async function processQueue () {
		const queuedRequests = pendingRequests
		pendingRequests = []
		flushTimeout = null
		try {
			const subreddits = queuedRequests.map((entry,) => entry.subreddit)
			const users = queuedRequests.map((entry,) => entry.user)
			const rawNotes = await getRecentModNotes(subreddits, users,)
			queuedRequests.forEach(({resolve,}, i,) => {
				const note = rawNotes[i] ?? null
				resolve(note && isEntryVisible(note, visibility,) ? note : null,)
			},)
		} catch (error) {
			for (const {reject,} of queuedRequests) {
				reject(error,)
			}
		}
	}

	return function getLatestEntry (subreddit: string, user: string,): Promise<ModNote | null> {
		return new Promise((resolve, reject,) => {
			pendingRequests.push({subreddit, user, resolve, reject,},)
			if (flushTimeout != null) {
				clearTimeout(flushTimeout,)
			}
			if (pendingRequests.length === maxBatchSize) {
				void processQueue()
				return
			}
			flushTimeout = setTimeout(processQueue, batchDelayMs,)
		},)
	}
}
