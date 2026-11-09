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

/** The token names ban note and message templates can use (see `banMacroTokens`). */
export const banTokenNames = ['author', 'subreddit', 'kind', 'title', 'url', 'mod', 'body',] as const

/** Token values a ban form knows regardless of what it was opened from. */
export interface BanTokenBase {
	author: string
	subreddit: string
	mod: string
}

/** The post or comment fields a ban form can fill the remaining tokens from. */
export interface BanTokenThing {
	kind?: string | undefined
	title?: string | undefined
	url?: string | undefined
	body?: string | undefined
}

/**
 * Builds the token values a ban form can substitute: author, subreddit and mod, plus kind, title,
 * url and body from the post or comment the form was opened from, when there is one. Empty values
 * are left out rather than substituted, so a token with nothing behind it (a comment's title, or any
 * item token when no item is in scope) stays visible for {@link unresolvedBanTokens} to flag instead
 * of silently vanishing from the message.
 * @param base Values always known to the form.
 * @param thing The item the form was opened from, if any.
 */
export function banTokenInfo (base: BanTokenBase, thing?: BanTokenThing | undefined,): Record<string, string> {
	const info: Record<string, string> = {}
	const candidates: Record<string, string | undefined> = {
		...base,
		kind: thing?.kind,
		title: thing?.title,
		url: thing?.url,
		body: thing?.body,
	}
	for (const [key, value,] of Object.entries(candidates,)) {
		if (typeof value === 'string' && value !== '') { info[key] = value }
	}
	return info
}

/**
 * Returns the ban tokens still written out in `text` - the ones the form couldn't fill - in the
 * order they're declared, so the form can warn that they will be sent as written.
 * @param text A ban note or message after substitution.
 */
export function unresolvedBanTokens (text: string,): string[] {
	const lower = text.toLowerCase()
	return banTokenNames.filter((name,) => lower.includes(`{${name}}`,)).map((name,) => `{${name}}`)
}

/** The subreddit-wide ban defaults (Config > Ban macro) a ban form starts from. */
export interface BanDefaultsSource {
	banNote?: string | undefined
	banMessage?: string | undefined
	defaultBanPermanent?: boolean | undefined
	defaultBanDuration?: number | undefined
}

/** A ban form's starting values, resolved from the subreddit's ban defaults. */
export interface ResolvedBanDefaults {
	note: string
	message: string
	permanent: boolean
	/** The default temporary duration, when the subreddit sets a valid one. */
	days?: number
}

/**
 * Resolves the subreddit's ban defaults into a form's starting values, with tokens substituted.
 * "Permanent by default" reads the way the mod button reads it: on unless explicitly off.
 * @param defaults The subreddit's `banMacros` block, or null/undefined when it has none.
 * @param tokenInfo Token values for this form (see {@link banTokenInfo}).
 */
export function resolveBanDefaults (
	defaults: BanDefaultsSource | null | undefined,
	tokenInfo: Record<string, string>,
): ResolvedBanDefaults {
	const resolved: ResolvedBanDefaults = {
		note: replaceTokens(tokenInfo, defaults?.banNote ?? '',).slice(0, maxBanMacroNote,),
		message: replaceTokens(tokenInfo, defaults?.banMessage ?? '',).slice(0, maxBanMacroMessage,),
		permanent: !!defaults && defaults.defaultBanPermanent !== false,
	}
	const days = defaults?.defaultBanDuration
	if (typeof days === 'number' && Number.isInteger(days,) && days >= 1 && days <= 999) { resolved.days = days }
	return resolved
}
