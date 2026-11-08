/** Wiki-backed reads of a subreddit's named ban macros. */

import createLogger from '../../../util/infra/logging'
import {getConfig,} from '../../config/moduleapi'
import type {SavedBanMacro,} from './schema'

const log = createLogger('TBBanMacros',)

/**
 * Returns the subreddit's named ban macros from its (cached) toolbox config.
 * Resolves to an empty list when the config is missing, unreadable, or has none,
 * so callers can render the picker unconditionally.
 * @param subreddit The subreddit whose macros to load.
 */
export async function getSavedBanMacros (subreddit: string,): Promise<SavedBanMacro[]> {
	try {
		const config = await getConfig(subreddit,)
		return config?.savedBanMacros ?? []
	} catch (error: unknown) {
		log.error(`Failed to load ban macros for /r/${subreddit}:`, error,)
		return []
	}
}
