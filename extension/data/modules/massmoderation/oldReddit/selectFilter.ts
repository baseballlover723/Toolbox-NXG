/**
 * Reads what the select/filter panel can match on from an old Reddit queue item, and tests items
 * against the panel's criteria.
 */

import {getThingTimestampEl,} from '../../../dom/oldReddit/queue'
import {
	getReportedStamp,
	getThingAuthorEl,
	getThingDomain,
	getThingSubredditName,
	getThingTitleAnchor,
} from '../../../dom/oldReddit/things'
import {type ItemKind, type ItemState, parseList, type SelectFilterCriteria, type TextCriterion,} from '../schema'

/** Marks a queue item the mod log shows was approved or removed outside this page; see the CSS fade. */
export const handledElsewhereClass = 'toolbox-modlog-handled-elsewhere'

/** Everything the matcher reads from one queue item, lowercased where matching is case-insensitive. */
export interface ThingFacts {
	kinds: Set<ItemKind>
	states: Set<ItemState>
	author: string | null
	domain: string | null
	subreddit: string | null
	title: string
	flairText: string
	reportText: string
	reportCount: number
	/** The exact score, or null when it is hidden or unreadable. */
	score: number | null
	/** Creation time in epoch milliseconds, or null when unreadable. */
	createdMs: number | null
}

/** Whether a pressed native button with the given event action shows on the item's own entry. */
function hasPressedButton (thing: Element, selector: string,): boolean {
	return !!thing.querySelector(`:scope > .entry .pretty-button.pressed${selector}`,)
}

/**
 * Reads the exact score from the item's own score element. Old Reddit puts the exact value in the
 * `title` of `.score.unvoted`; a hidden score ("[score hidden]") has no numeric title, so it reads as
 * null and never matches a score criterion.
 */
function readScore (thing: Element,): number | null {
	const fromTitle = thing.querySelector(':scope > .entry .score.unvoted, :scope > .midcol .score.unvoted',)
		?.getAttribute('title',)
	const raw = fromTitle ?? thing.getAttribute('data-score',)
	if (raw === null || raw.trim() === '') { return null }
	const score = Number(raw,)
	return Number.isFinite(score,) ? score : null
}

/** Reads the creation time from `data-timestamp` (ms), falling back to the tagline's `time` element. */
function readCreatedMs (thing: Element,): number | null {
	const stamp = Number(thing.getAttribute('data-timestamp',),)
	if (Number.isFinite(stamp,) && stamp > 0) { return stamp }
	const datetime = getThingTimestampEl(thing,)?.getAttribute('datetime',)
	const parsed = datetime ? Date.parse(datetime,) : NaN
	return Number.isFinite(parsed,) ? parsed : null
}

/** Reads every fact the matcher uses from a queue item. */
export function readThingFacts (thing: Element,): ThingFacts {
	const kinds = new Set<ItemKind>()
	const isComment = thing.classList.contains('comment',)
	if (isComment) {
		kinds.add('comment',)
	} else if (thing.classList.contains('self',)) {
		kinds.add('textPost',)
	} else if (thing.classList.contains('link',)) {
		kinds.add('linkPost',)
	}
	const flair = thing.querySelector(':scope > .entry .linkflairlabel',)
	if (!isComment && flair) { kinds.add('flaired',) }

	const states = new Set<ItemState>()
	const classList = thing.classList
	if (classList.contains('banned-user',)) {
		states.add('shadowbanned',)
	} else if (classList.contains('spam',)) {
		states.add('spamFiltered',)
	}
	if (classList.contains(handledElsewhereClass,)) { states.add('handledElsewhere',) }
	// Toolbox colors items actioned on this page (queueModtools); a pressed native button covers an
	// action taken before Toolbox recolored the item.
	if (classList.contains('approved',) || hasPressedButton(thing, '.positive',)) { states.add('approved',) }
	if (classList.contains('removed',) || hasPressedButton(thing, '.neutral',)) { states.add('removed',) }
	if (classList.contains('spammed',) || hasPressedButton(thing, '.negative',)) { states.add('spammed',) }
	// `*=` covers both "ignorereports" and "unignorereports".
	if (hasPressedButton(thing, '[data-event-action*="ignorereports"]',)) { states.add('ignored',) }

	const author = thing.getAttribute('data-author',) ?? getThingAuthorEl(thing,)?.textContent?.trim() ?? null
	const domain = thing.getAttribute('data-domain',) ?? (isComment ? null : getThingDomain(thing,))
	const subreddit = thing.getAttribute('data-subreddit',) ?? getThingSubredditName(thing,)
	const reportCountText = getReportedStamp(thing,)?.textContent?.match(/\d+/,)?.[0]

	return {
		kinds,
		states,
		author: author ? author.toLowerCase() : null,
		domain: domain ? domain.toLowerCase() : null,
		subreddit: subreddit ? subreddit.toLowerCase() : null,
		title: getThingTitleAnchor(thing,)?.textContent?.toLowerCase() ?? '',
		flairText: (flair?.getAttribute('title',) || flair?.textContent || '').toLowerCase(),
		reportText: thing.querySelector('.report-reasons',)?.textContent?.toLowerCase() ?? '',
		reportCount: reportCountText ? parseInt(reportCountText, 10,) : 0,
		score: readScore(thing,),
		createdMs: readCreatedMs(thing,),
	}
}

/** Applies a criterion's negation: a negated criterion passes exactly when the plain test fails. */
function applyNegation (criterion: TextCriterion, matches: boolean,): boolean {
	return criterion.negate ? !matches : matches
}

/** Whether a domain is one of the listed domains or a subdomain of one (`youtube.com` covers `m.youtube.com`). */
function domainMatches (domain: string, listed: string,): boolean {
	return domain === listed || domain.endsWith(`.${listed}`,)
}

/**
 * Whether an item's facts satisfy every switched-on group of the criteria.
 * @param facts The item's facts, from {@link readThingFacts}.
 * @param criteria The panel's criteria.
 * @param nowMs The current time in epoch milliseconds, for the age criteria.
 */
export function factsMatch (facts: ThingFacts, criteria: SelectFilterCriteria, nowMs: number,): boolean {
	if (criteria.types.length > 0) {
		const any = criteria.types.some((kind,) => facts.kinds.has(kind,))
		if (criteria.negateTypes ? any : !any) { return false }
	}
	if (criteria.states.length > 0) {
		const any = criteria.states.some((state,) => facts.states.has(state,))
		if (criteria.negateStates ? any : !any) { return false }
	}

	const listChecks: Array<[TextCriterion, string | null, (value: string, listed: string,) => boolean,]> = [
		[criteria.users, facts.author, (value, listed,) => value === listed,],
		[criteria.domains, facts.domain, domainMatches,],
		[criteria.subreddits, facts.subreddit, (value, listed,) => value === listed,],
	]
	for (const [criterion, value, test,] of listChecks) {
		const listed = parseList(criterion.value,)
		if (listed.length === 0) { continue }
		const matches = value !== null && listed.some((entry,) => test(value, entry,))
		if (!applyNegation(criterion, matches,)) { return false }
	}

	const containsChecks: Array<[TextCriterion, string,]> = [
		[criteria.title, facts.title,],
		[criteria.flairText, facts.flairText,],
		[criteria.reportText, facts.reportText,],
	]
	for (const [criterion, haystack,] of containsChecks) {
		const needle = criterion.value.trim().toLowerCase()
		if (needle === '') { continue }
		if (!applyNegation(criterion, haystack.includes(needle,),)) { return false }
	}

	if (criteria.minReports !== null && facts.reportCount < criteria.minReports) { return false }
	if (criteria.scoreAbove !== null && (facts.score === null || facts.score <= criteria.scoreAbove)) {
		return false
	}
	if (criteria.scoreBelow !== null && (facts.score === null || facts.score >= criteria.scoreBelow)) {
		return false
	}
	if (criteria.olderThanHours !== null || criteria.newerThanHours !== null) {
		if (facts.createdMs === null) { return false }
		const ageHours = (nowMs - facts.createdMs) / 3_600_000
		if (criteria.olderThanHours !== null && ageHours <= criteria.olderThanHours) { return false }
		if (criteria.newerThanHours !== null && ageHours >= criteria.newerThanHours) { return false }
	}
	return true
}

/** Whether a queue item matches the criteria; see {@link factsMatch}. */
export function thingMatches (thing: Element, criteria: SelectFilterCriteria, nowMs: number,): boolean {
	return factsMatch(readThingFacts(thing,), criteria, nowMs,)
}
