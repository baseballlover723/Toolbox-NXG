/** Tests for the Native Mod Log visibility rules and tab helpers. */

import {describe, expect, it,} from 'vitest'

import type {ModNote,} from '../shared/modnotes/schema'
import {defaultTabIndex, isEntryVisible, tabLayout, visibleTabs,} from './schema'

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

const summary = makeEntry({user_note_data: {note: 'A summary', label: 'USER_SUMMARY', reddit_id: null,},},)
const action = makeEntry({
	type: 'REMOVAL',
	user_note_data: null,
	mod_action_data: {action: 'removelink', details: null, description: null, reddit_id: null,},
},)

describe('isEntryVisible', () => {
	it('always shows ordinary notes', () => {
		expect(isEntryVisible(makeEntry(), {showAiSummaries: false, showModActions: false,},),).toBe(true,)
	})

	it('hides AI summaries unless they are turned on', () => {
		expect(isEntryVisible(summary, {showAiSummaries: false, showModActions: true,},),).toBe(false,)
		expect(isEntryVisible(summary, {showAiSummaries: true, showModActions: true,},),).toBe(true,)
	})

	it('hides mod actions when they are turned off', () => {
		expect(isEntryVisible(action, {showAiSummaries: false, showModActions: false,},),).toBe(false,)
		expect(isEntryVisible(action, {showAiSummaries: false, showModActions: true,},),).toBe(true,)
	})
})

describe('visibleTabs', () => {
	it('offers all three tabs when mod actions are shown', () => {
		expect(visibleTabs(true,).map((tab,) => tab.key),).toEqual(['all_activity', 'notes', 'mod_actions',],)
	})

	it('offers only the Notes tab when mod actions are hidden', () => {
		expect(visibleTabs(false,).map((tab,) => tab.key),).toEqual(['notes',],)
	})
})

describe('defaultTabIndex', () => {
	it('opens the preferred tab', () => {
		expect(defaultTabIndex(visibleTabs(true,), 'mod_actions',),).toBe(2,)
	})

	it('falls back to the first tab when the preferred one is hidden', () => {
		expect(defaultTabIndex(visibleTabs(false,), 'mod_actions',),).toBe(0,)
	})
})

describe('tabLayout', () => {
	const [allActivity, notes,] = visibleTabs(true,)

	it('switches the Notes tab to a table when the setting asks for one', () => {
		expect(tabLayout(notes!, 'table',),).toBe('table',)
	})

	it('leaves the Notes tab on its default cards otherwise', () => {
		expect(tabLayout(notes!, 'cards',),).toBeUndefined()
	})

	it('never changes the other tabs', () => {
		expect(tabLayout(allActivity!, 'table',),).toBeUndefined()
	})
})
