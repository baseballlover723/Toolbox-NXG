/** Domain types, limits, and pure helpers for the named ban macros offered on every ban surface. */

import {replaceTokens,} from '../../../util/data/string'
import {pickSubstitutionTokens,} from '../../../util/wiki/schemas/shared/tokens'

/** Maximum length of the internal ban note Reddit accepts. */
export const maxBanMacroNote = 300
/** Maximum length of the ban message `banUser` sends (longer text is truncated by the API wrapper). */
export const maxBanMacroMessage = 999
/** Notice appended to the ban message when a ban also removes all the user's posts and comments. */
export const removeAllBanNotice =
	'\n\nNote: All of your posts and comments in this subreddit have been removed as a result of this ban.'

/** Duration used when a stored macro has no usable day count. */
export const defaultBanMacroDays = 7

/** The substitution tokens supported in ban macro note and message templates. */
export const banMacroTokens = pickSubstitutionTokens(
	['{author}', '{subreddit}', '{kind}', '{title}', '{url}', '{mod}', '{body}',],
)

/**
 * A named ban template stored in the subreddit config (`savedBanMacros`). Mods
 * pick one from a dropdown on any ban surface to fill that surface's fields.
 * NXG-only: never written to the legacy 6.x mirror.
 */
export interface SavedBanMacro {
	/** Stable id assigned by `ensureStableIds`. */
	id?: string
	/** Name shown in the picker. */
	title: string
	/** Internal ban note (mod log only); may contain substitution tokens. */
	note: string
	/** Message sent to the banned user; may contain substitution tokens. */
	message: string
	/** Whether the ban is permanent; when true, `days` is ignored. */
	permanent: boolean
	/** Temporary ban length in days (1-999). */
	days: number
	/**
	 * Also remove all the user's posts and comments in the subreddit. Permanent bans only, like
	 * the mod button's own option; only the mod button ban form can act on it.
	 */
	removeAll?: boolean
}

/** A ban macro with its tokens substituted, ready to drop into a ban form. */
export interface ResolvedBanMacro {
	note: string
	message: string
	permanent: boolean
	days: number
	/** True only for a permanent macro with `removeAll` set. */
	removeAll: boolean
}

/** Clamps a day count to Reddit's accepted 1-999 range, falling back to the default for garbage. */
export function clampBanDays (days: unknown,): number {
	if (typeof days !== 'number' || !Number.isFinite(days,)) { return defaultBanMacroDays }
	return Math.min(999, Math.max(1, Math.floor(days,),),)
}

/**
 * Substitutes tokens in a macro's note and message and normalizes its duration.
 * @param macro The stored macro.
 * @param tokenInfo Token values for the current context (author, subreddit, ...); unknown tokens are left as written.
 */
export function resolveBanMacro (macro: SavedBanMacro, tokenInfo: Record<string, string>,): ResolvedBanMacro {
	return {
		note: replaceTokens(tokenInfo, macro.note,).slice(0, maxBanMacroNote,),
		message: replaceTokens(tokenInfo, macro.message,).slice(0, maxBanMacroMessage,),
		permanent: macro.permanent,
		days: clampBanDays(macro.days,),
		removeAll: macro.permanent && macro.removeAll === true,
	}
}
