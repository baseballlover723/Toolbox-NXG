/** Tests for the Native Mod Log latest-entry fetcher. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const getRecentModNotes = vi.hoisted(() => vi.fn())
vi.mock('../../api/resources/modnotes', () => ({getRecentModNotes,}),)

import type {ModNote,} from '../shared/modnotes/schema'
import {createLatestEntryFetcher,} from './moduleapi'

function makeEntry (overrides: Partial<ModNote> = {},): ModNote {
	return {
		id: 'ModNote_1',
		created_at: 1,
		type: 'NOTE',
		operator: 'mod',
		subreddit: 'testsub',
		user: 'alice',
		label: null,
		description: null,
		details: null,
		user_note_data: {note: 'hello', label: null, reddit_id: null,},
		mod_action_data: null,
		...overrides,
	}
}

const note = makeEntry()
const summary = makeEntry({user_note_data: {note: 'A summary', label: 'USER_SUMMARY', reddit_id: null,},},)
const action = makeEntry({
	type: 'REMOVAL',
	user_note_data: null,
	mod_action_data: {action: 'removelink', details: null, description: null, reddit_id: null,},
},)

describe('createLatestEntryFetcher', () => {
	beforeEach(() => {
		vi.useFakeTimers()
		getRecentModNotes.mockReset()
	},)
	afterEach(() => {
		vi.useRealTimers()
	},)

	it('batches concurrent lookups into one request', async () => {
		getRecentModNotes.mockResolvedValue([note, null,],)
		const fetchLatest = createLatestEntryFetcher({showAiSummaries: false, showModActions: true,},)

		const first = fetchLatest('testsub', 'alice',)
		const second = fetchLatest('othersub', 'bob',)
		await vi.runAllTimersAsync()

		expect(getRecentModNotes,).toHaveBeenCalledTimes(1,)
		expect(getRecentModNotes,).toHaveBeenCalledWith(['testsub', 'othersub',], ['alice', 'bob',],)
		await expect(first,).resolves.toBe(note,)
		await expect(second,).resolves.toBeNull()
	})

	it('resolves hidden entries to null', async () => {
		getRecentModNotes.mockResolvedValue([summary, action,],)
		const fetchLatest = createLatestEntryFetcher({showAiSummaries: false, showModActions: false,},)

		const first = fetchLatest('testsub', 'alice',)
		const second = fetchLatest('testsub', 'bob',)
		await vi.runAllTimersAsync()

		await expect(first,).resolves.toBeNull()
		await expect(second,).resolves.toBeNull()
	})

	it('passes summaries and actions through when they are shown', async () => {
		getRecentModNotes.mockResolvedValue([summary, action,],)
		const fetchLatest = createLatestEntryFetcher({showAiSummaries: true, showModActions: true,},)

		const first = fetchLatest('testsub', 'alice',)
		const second = fetchLatest('testsub', 'bob',)
		await vi.runAllTimersAsync()

		await expect(first,).resolves.toBe(summary,)
		await expect(second,).resolves.toBe(action,)
	})

	it('rejects every queued lookup when the request fails', async () => {
		getRecentModNotes.mockRejectedValue(new Error('boom',),)
		const fetchLatest = createLatestEntryFetcher({showAiSummaries: false, showModActions: true,},)

		const first = fetchLatest('testsub', 'alice',)
		const second = fetchLatest('testsub', 'bob',)
		const settled = Promise.allSettled([first, second,],)
		await vi.runAllTimersAsync()

		const results = await settled
		expect(results.map((result,) => result.status),).toEqual(['rejected', 'rejected',],)
	})
})
