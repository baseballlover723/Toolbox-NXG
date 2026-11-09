/** The once-per-tab reminder a prerelease build shows when its modbar version label is hidden. */

import {modbar,} from '../../framework/moduleIds'
import {buildType,} from '../../util/infra/buildenv'
import {toolboxVersion,} from '../../util/infra/version'
import {getSettingAsync,} from '../../util/persistence/settings'
import {ANNOUNCEMENTS_SUB,} from './constants'
import type {AnnouncementNote,} from './types'

/** Note id for the reminder; never written to the seen list, so it can't be hidden for good. */
export const prereleaseReminderId = 'toolbox-nxg-prerelease-reminder'

// Per-tab dismissal: sessionStorage lives as long as the tab (surviving reloads in it), so each
// new tab shows the reminder once until it is closed there.
const dismissedKey = 'toolbox-nxg-prerelease-reminder-dismissed'

/** Whether the reminder was already closed in this tab. Storage errors (privacy modes) count as not. */
function dismissedInThisTab (): boolean {
	try {
		return sessionStorage.getItem(dismissedKey,) === '1'
	} catch {
		return false
	}
}

/** Records that the reminder was closed in this tab. */
export function dismissPrereleaseReminder (): void {
	try {
		sessionStorage.setItem(dismissedKey, '1',)
	} catch {
		// Without storage the reminder simply returns on the next page load.
	}
}

/**
 * Builds the reminder note.
 * @param build The running prerelease build type.
 * @param version The full version string, for bug reports.
 */
export function prereleaseReminderNote (build: string, version: string,): AnnouncementNote {
	return {
		id: prereleaseReminderId,
		title: `You are running a ${build} build of Toolbox-NXG`,
		body: `This is ${version}. Prerelease builds can have bugs: if something breaks or looks wrong, `
			+ `please report it in r/${ANNOUNCEMENTS_SUB}. This shows in each new tab because the modbar `
			+ 'version label is turned off.',
		link: `https://www.reddit.com/r/${ANNOUNCEMENTS_SUB}/`,
		linkLabel: 'Report an issue',
	}
}

/**
 * Returns the reminder note when it should show on this page: a prerelease build, the modbar
 * version label turned off, and not yet closed in this tab. Otherwise null.
 */
export async function pendingPrereleaseReminder (): Promise<AnnouncementNote | null> {
	if (buildType === 'stable') { return null }
	const showLabel = await getSettingAsync(modbar, 'showPrereleaseLabel', true,)
	if (showLabel !== false || dismissedInThisTab()) { return null }
	return prereleaseReminderNote(buildType, toolboxVersion,)
}
