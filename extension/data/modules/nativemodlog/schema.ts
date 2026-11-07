/** Domain types and visibility rules for the Native Mod Log module. */

import type {ModNote,} from '../shared/modnotes/schema'

/** Which kinds of native mod log entry the moderator has chosen to see. */
export interface EntryVisibility {
	/** Show Reddit's auto-generated `USER_SUMMARY` notes. */
	showAiSummaries: boolean
	/** Show mod-action entries (anything whose type is not `NOTE`). */
	showModActions: boolean
}

/** Label Reddit gives its AI-generated user summary "notes". */
export const aiSummaryLabel = 'USER_SUMMARY'

/** True when the entry is one of Reddit's AI-generated user summaries. */
export function isAiSummary (note: ModNote,): boolean {
	return note.user_note_data?.label === aiSummaryLabel
}

/**
 * Decides whether a native mod log entry should be shown, given the moderator's
 * visibility settings. Shared by the NN tag and the popup history so both always
 * agree on what counts as hidden.
 */
export function isEntryVisible (note: ModNote, {showAiSummaries, showModActions,}: EntryVisibility,): boolean {
	if (!showAiSummaries && isAiSummary(note,)) { return false }
	if (!showModActions && note.type !== 'NOTE') { return false }
	return true
}

/** Tabs of the native mod log popup, keyed the way the `defaultTabName` selector stores them. */
export type ModLogTabKey = 'all_activity' | 'notes' | 'mod_actions'

/** One tab of the native mod log popup: its key, title, and the API type filter it requests. */
export interface ModLogTab {
	key: ModLogTabKey
	title: string
	/** Note-type filter passed to the API; omitted for the unfiltered "All Activity" view. */
	filter?: string
}

const allTabs: readonly ModLogTab[] = [
	{key: 'all_activity', title: 'All Activity',},
	{key: 'notes', title: 'Notes', filter: 'NOTE',},
	{key: 'mod_actions', title: 'Mod Actions', filter: 'MOD_ACTION',},
]

/**
 * Returns the popup tabs to show. With mod actions hidden, "All Activity" would
 * hold only notes and "Mod Actions" would be empty, so just the Notes tab remains.
 */
export function visibleTabs (showModActions: boolean,): readonly ModLogTab[] {
	return showModActions ? allTabs : allTabs.filter((tab,) => tab.key === 'notes')
}

/** Index of the tab to open first, falling back to the first tab when the preferred one is hidden. */
export function defaultTabIndex (tabs: readonly ModLogTab[], preferred: string,): number {
	const index = tabs.findIndex((tab,) => tab.key === preferred)
	return index === -1 ? 0 : index
}
