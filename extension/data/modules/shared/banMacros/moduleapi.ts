/** Wiki-backed reads of a subreddit's named ban macros. */

import createLogger from '../../../util/infra/logging'
import {getConfig,} from '../../config/moduleapi'
import type {BanDefaultsSource, SavedBanMacro,} from './schema'

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

/** What a ban form needs from the subreddit config, read in one pass. */
export interface BanFormSettings {
	/** The subreddit-wide ban defaults (Config > Ban macro), or null when it has none. */
	defaults: BanDefaultsSource | null
	/** The named ban macros offered in the picker. */
	savedBanMacros: SavedBanMacro[]
	/** Whether a ban issued from a ban form must carry a message. */
	requireBanMessage: boolean
}

/**
 * Loads a subreddit's ban defaults, named ban macros and ban message requirement from its (cached)
 * toolbox config. Degrades to no defaults, no macros and no requirement when the config is missing
 * or unreadable, so a ban form always opens.
 * @param subreddit The subreddit whose ban settings to load.
 */
export async function getBanFormSettings (subreddit: string,): Promise<BanFormSettings> {
	try {
		const config = await getConfig(subreddit,)
		const defaults = config?.banMacros
		return {
			defaults: defaults && typeof defaults === 'object' ? defaults : null,
			savedBanMacros: config?.savedBanMacros ?? [],
			requireBanMessage: config?.requireBanMessage === true,
		}
	} catch (error: unknown) {
		log.error(`Failed to load ban settings for /r/${subreddit}:`, error,)
		return {defaults: null, savedBanMacros: [], requireBanMessage: false,}
	}
}
