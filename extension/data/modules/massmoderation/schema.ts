/** Domain types for the queue toolbar's select/filter panel, plus its pure helpers. */

/** Item kinds the Type group can match. */
export type ItemKind = 'textPost' | 'linkPost' | 'comment' | 'flaired'

/** Item states the State group can match. */
export type ItemState =
	| 'spamFiltered'
	| 'shadowbanned'
	| 'handledElsewhere'
	| 'approved'
	| 'removed'
	| 'spammed'
	| 'ignored'

/** Every {@link ItemKind}, in panel order. */
export const itemKinds: readonly ItemKind[] = ['textPost', 'linkPost', 'comment', 'flaired',]

/** Every {@link ItemState}, in panel order. */
export const itemStates: readonly ItemState[] = [
	'spamFiltered',
	'shadowbanned',
	'handledElsewhere',
	'approved',
	'removed',
	'spammed',
	'ignored',
]

/** Display labels for {@link ItemKind}. */
export const itemKindLabels: Record<ItemKind, string> = {
	textPost: 'text posts',
	linkPost: 'link posts',
	comment: 'comments',
	flaired: 'posts with flair',
}

/** Display labels for {@link ItemState}. */
export const itemStateLabels: Record<ItemState, string> = {
	spamFiltered: 'spam-filtered',
	shadowbanned: 'shadow-banned',
	handledElsewhere: 'handled by another mod',
	approved: 'approved here',
	removed: 'removed here',
	spammed: 'spammed here',
	ignored: 'reports ignored here',
}

/** A free-text criterion, optionally negated ("is not" / "doesn't contain"). */
export interface TextCriterion {
	/** The raw text the mod typed; empty means the criterion is off. */
	value: string
	/** When true, the criterion matches items that do NOT match the text. */
	negate: boolean
}

/** Field names of the text criteria, in panel order. */
export const textCriterionFields = ['users', 'domains', 'subreddits', 'title', 'flairText', 'reportText',] as const

/** One of the text criteria's field names. */
export type TextCriterionField = typeof textCriterionFields[number]

/** Field names of the numeric criteria, in panel order. */
export const numberCriterionFields = [
	'minReports',
	'scoreAbove',
	'scoreBelow',
	'olderThanHours',
	'newerThanHours',
] as const

/** One of the numeric criteria's field names. */
export type NumberCriterionField = typeof numberCriterionFields[number]

/**
 * Everything the select/filter panel can match on. Each group (types, states, each text field, each
 * number) is ANDed with the others; choices inside the types and states groups, and the comma-separated
 * entries of the user/domain/subreddit lists, are ORed. Empty groups are ignored.
 */
export type SelectFilterCriteria =
	& {
		/** Item kinds, ORed. */
		types: ItemKind[]
		/** When true, matches items that are none of `types`. */
		negateTypes: boolean
		/** Item states, ORed. */
		states: ItemState[]
		/** When true, matches items in none of `states`. */
		negateStates: boolean
	}
	& Record<TextCriterionField, TextCriterion>
	& Record<NumberCriterionField, number | null>

/** What applying the panel does: narrow the view, or change the checkbox selection. */
export type SelectFilterMode = 'filter' | 'select'

/** How a "select" apply changes the existing selection. */
export type SelectVerb = 'replace' | 'add' | 'deselect'

/** Match counts the panel shows while the mod edits criteria. */
export interface MatchCount {
	/** Items that match the criteria. */
	matched: number
	/** Items the criteria were tested against. */
	total: number
}

/** Returns criteria with every group switched off. */
export function emptyCriteria (): SelectFilterCriteria {
	return {
		types: [],
		negateTypes: false,
		states: [],
		negateStates: false,
		users: {value: '', negate: false,},
		domains: {value: '', negate: false,},
		subreddits: {value: '', negate: false,},
		title: {value: '', negate: false,},
		flairText: {value: '', negate: false,},
		reportText: {value: '', negate: false,},
		minReports: null,
		scoreAbove: null,
		scoreBelow: null,
		olderThanHours: null,
		newerThanHours: null,
	}
}

/**
 * Splits a comma- or space-separated list into lowercase entries, dropping empties and the `u/`, `/u/`,
 * `r/` and `/r/` prefixes mods tend to paste.
 */
export function parseList (value: string,): string[] {
	return value
		.split(/[\s,]+/,)
		.map((entry,) => entry.trim().toLowerCase().replace(/^\/?[ur]\//, '',))
		.filter(Boolean,)
}

/** Whether no group of the criteria is switched on, so applying it would match everything. */
export function isEmptyCriteria (criteria: SelectFilterCriteria,): boolean {
	return criteria.types.length === 0
		&& criteria.states.length === 0
		&& textCriterionFields.every((field,) => criteria[field].value.trim() === '')
		&& numberCriterionFields.every((field,) => criteria[field] === null)
}

const textCriterionLabels: Record<TextCriterionField, [is: string, isNot: string,]> = {
	users: ['user', 'user not',],
	domains: ['domain', 'domain not',],
	subreddits: ['sub', 'sub not',],
	title: ['title has', 'title lacks',],
	flairText: ['flair has', 'flair lacks',],
	reportText: ['report has', 'report lacks',],
}

/** A short human-readable summary of the active criteria, for the toolbar's filter chip. */
export function describeCriteria (criteria: SelectFilterCriteria,): string {
	const parts: string[] = []
	if (criteria.types.length > 0) {
		const kinds = criteria.types.map((kind,) => itemKindLabels[kind]).join(' or ',)
		parts.push(criteria.negateTypes ? `not ${kinds}` : kinds,)
	}
	if (criteria.states.length > 0) {
		const states = criteria.states.map((state,) => itemStateLabels[state]).join(' or ',)
		parts.push(criteria.negateStates ? `not ${states}` : states,)
	}
	for (const field of textCriterionFields) {
		const {value, negate,} = criteria[field]
		if (value.trim() === '') { continue }
		const [is, isNot,] = textCriterionLabels[field]
		parts.push(`${negate ? isNot : is} ${value.trim()}`,)
	}
	if (criteria.minReports !== null) { parts.push(`${criteria.minReports}+ reports`,) }
	if (criteria.scoreAbove !== null) { parts.push(`score > ${criteria.scoreAbove}`,) }
	if (criteria.scoreBelow !== null) { parts.push(`score < ${criteria.scoreBelow}`,) }
	if (criteria.olderThanHours !== null) { parts.push(`older than ${criteria.olderThanHours}h`,) }
	if (criteria.newerThanHours !== null) { parts.push(`newer than ${criteria.newerThanHours}h`,) }
	return parts.join(', ',)
}

/** Narrows an unknown value to a plain object whose keys can be read. */
function isRecord (value: unknown,): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value,)
}

/**
 * Rebuilds criteria from stored JSON, keeping only well-formed fields so a hand-edited or older
 * stored value can never break the panel. Returns empty criteria for anything unparseable.
 */
export function parseStoredCriteria (stored: string,): SelectFilterCriteria {
	const criteria = emptyCriteria()
	let raw: unknown
	try {
		raw = JSON.parse(stored,)
	} catch {
		return criteria
	}
	if (!isRecord(raw,)) { return criteria }
	const record = raw
	if (Array.isArray(record.types,)) {
		criteria.types = record.types.filter((kind,): kind is ItemKind =>
			typeof kind === 'string' && kind in itemKindLabels
		)
	}
	if (Array.isArray(record.states,)) {
		criteria.states = record.states.filter((state,): state is ItemState =>
			typeof state === 'string' && state in itemStateLabels
		)
	}
	criteria.negateTypes = record.negateTypes === true
	criteria.negateStates = record.negateStates === true
	for (const field of textCriterionFields) {
		const value: unknown = record[field]
		if (isRecord(value,)) {
			criteria[field] = {
				value: typeof value.value === 'string' ? value.value : '',
				negate: value.negate === true,
			}
		}
	}
	for (const field of numberCriterionFields) {
		const value: unknown = record[field]
		criteria[field] = typeof value === 'number' && Number.isFinite(value,) ? value : null
	}
	return criteria
}
