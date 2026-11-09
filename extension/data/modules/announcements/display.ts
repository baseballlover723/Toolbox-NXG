/** Fetches and displays toolbox announcements from the toolbox_nxg wiki. */

import {readFromWiki,} from '../../api/resources/wiki'
import {nowInSeconds,} from '../../util/data/time'
import {buildType,} from '../../util/infra/buildenv'
import createLogger from '../../util/infra/logging'
import {showAnnouncementsPopup,} from './components/AnnouncementsPopup'
import {ANNOUNCEMENTS_PAGE, ANNOUNCEMENTS_SUB,} from './constants'
import {filterByPublishAt,} from './noteUtils'
import {pendingPrereleaseReminder,} from './prereleaseReminder'
import {getSeenIds,} from './seen'
import type {AnnouncementNote, AnnouncementsWikiData,} from './types'

const log = createLogger('Announcements',)

/**
 * Fetches and parses announcements from the wiki.
 * Returns an empty array on any failure so callers never need to handle errors.
 */
async function fetchNotes (): Promise<AnnouncementNote[]> {
	const result = await readFromWiki<AnnouncementsWikiData>(ANNOUNCEMENTS_SUB, ANNOUNCEMENTS_PAGE, true,)
	if (!result.ok) {
		log.warn(`Could not read announcements wiki (${result.reason})`,)
		return []
	}
	if (result.data.version !== 1 || !Array.isArray(result.data.notes,)) {
		log.warn('Unexpected announcements wiki schema',)
		return []
	}
	return result.data.notes
}

/**
 * Filters notes to only those relevant for the given build type.
 * Notes with no `buildTypes` field are shown on all builds. Only called for
 * non-dev builds (the display path returns early on dev), so `build` is narrowed
 * to the values a note can target.
 */
export function filterByBuildType (
	notes: AnnouncementNote[],
	build: 'stable' | 'beta',
): AnnouncementNote[] {
	return notes.filter((n,) => !n.buildTypes || n.buildTypes.includes(build,))
}

/**
 * Filters notes to only those whose IDs are not in `seenIds`.
 */
export function filterUnseen (notes: AnnouncementNote[], seenIds: string[],): AnnouncementNote[] {
	const seen = new Set(seenIds,)
	return notes.filter((n,) => !seen.has(n.id,))
}

/**
 * Fetches announcements from the toolbox_nxg wiki and filters out not-yet-due (scheduled),
 * irrelevant-build, and already-seen notes. Empty in dev builds, and on any failure, so a
 * wiki problem never also suppresses the prerelease reminder.
 */
async function unseenAnnouncements (): Promise<AnnouncementNote[]> {
	if (buildType === 'dev') {
		return []
	}
	try {
		const notes = await fetchNotes()
		const live = filterByPublishAt(notes, nowInSeconds(),)
		const buildFiltered = filterByBuildType(live, buildType,)
		const seenIds = await getSeenIds()
		return filterUnseen(buildFiltered, seenIds,)
	} catch (error: unknown) {
		log.error('Failed to load announcements:', error,)
		return []
	}
}

/**
 * Shows the announcements popup for any unseen announcements, led by the prerelease reminder
 * when that is due (see {@link pendingPrereleaseReminder}). One popup, so the two never stack.
 */
export async function displayAnnouncements (): Promise<void> {
	try {
		const [reminder, unseen,] = await Promise.all([pendingPrereleaseReminder(), unseenAnnouncements(),],)
		const notes = reminder ? [reminder, ...unseen,] : unseen

		if (notes.length === 0) {
			return
		}

		// Notes are marked seen individually by the popup as the user pages away
		// from or closes each one (see markSeen), not here - so a note the user
		// never actually views (e.g. a quick reload) is not silently hidden.
		showAnnouncementsPopup(notes,)
	} catch (error: unknown) {
		log.error('Failed to display announcements:', error,)
	}
}
