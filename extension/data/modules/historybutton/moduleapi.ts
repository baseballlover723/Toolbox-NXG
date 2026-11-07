/** API helpers for fetching and aggregating a user's submission and comment history data. */
import type {CommentData, RedditThing, SubmissionData,} from '../../api/resources/things'
import {aboutUser,} from '../../api/resources/users'
import {getUserComments, getUserSubmissions,} from '../../api/resources/users'
import {accountFromOembed, accountFromUrl, countLinkedAccount, type OembedData, type ResolvedAccount,} from './accounts'
import {type CommentHistoryData, type LinkedAccounts, type SubmissionHistoryData, type UserInfo,} from './schema'

/**
 * Fetches basic account information for a Reddit user.
 * @returns Account age, submission karma, and comment karma.
 */
export async function getUserInfo (user: string,): Promise<UserInfo> {
	const {data,} = await aboutUser(user,)
	return {
		createdAt: new Date(data.created_utc * 1000,),
		submissionKarma: data.link_karma,
		commentKarma: data.comment_karma,
	}
}

// Matches http(s) URLs; excludes trailing punctuation that isn't part of the URL.
const urlRegex = /https?:\/\/[^\s"()[\]<>]+/g
// Sentence punctuation that commonly follows a URL in prose ("see https://x.com/foo.").
// Underscore is deliberately absent: handles can end with one.
const trailingPunctuation = /[.,;:!?'*~]+$/

/** Returns the non-Reddit URLs linked in `text`. */
function extractExternalLinks (text: string,): URL[] {
	const matches = text.match(urlRegex,) ?? []
	const result: URL[] = []
	for (const raw of matches) {
		try {
			const url = new URL(raw.replace(trailingPunctuation, '',),)
			if (url.hostname && url.hostname !== 'reddit.com' && !url.hostname.endsWith('.reddit.com',)) {
				result.push(url,)
			}
		} catch {
			// malformed URL, skip
		}
	}
	return result
}

function incrementDomain (map: Record<string, {count: number}>, domain: string,) {
	const entry = map[domain] ??= {count: 0,}
	entry.count++
}

/**
 * Counts the external link domains and recognized accounts in `text` into `domains` and `accounts`.
 * No-ops if `text` is falsy.
 */
function accumulateTextLinks (
	domains: Record<string, {count: number}>,
	accounts: LinkedAccounts,
	text: string | null | undefined,
) {
	if (!text) { return }
	for (const url of extractExternalLinks(text,)) {
		incrementDomain(domains, url.hostname,)
		const account = accountFromUrl(url.href,)
		if (account) {
			countLinkedAccount(accounts, account,)
		}
	}
}

/** Submission fields read when aggregating history; `media`/`secure_media` carry Reddit's oEmbed data. */
type HistorySubmission = SubmissionData & {
	selftext?: string
	media?: {oembed?: OembedData} | null
	secure_media?: {oembed?: OembedData} | null
}

/** Resolves the account behind a link submission: oEmbed author first, then the link URL itself. */
function submissionAccount (submission: HistorySubmission,): ResolvedAccount | undefined {
	const oembed = submission.media?.oembed ?? submission.secure_media?.oembed
	return (oembed && accountFromOembed(oembed,)) || (submission.url ? accountFromUrl(submission.url,) : undefined)
}

/**
 * Fetches and aggregates a user's submission history into domain, subreddit, and linked-account frequency tables.
 * @returns Total submission count, per-domain counts, per-subreddit counts with karma, accounts submitted from,
 * and external domains and accounts linked in selfpost bodies.
 */
export async function getSubmissionHistoryData (user: string,): Promise<SubmissionHistoryData> {
	let total = 0
	const domains = Object.create(null,) as Record<string, {count: number}>
	const subreddits = Object.create(null,) as Record<string, {count: number; karma: number}>
	const textLinkDomains = Object.create(null,) as Record<string, {count: number}>
	const accounts = Object.create(null,) as LinkedAccounts
	const textLinkAccounts = Object.create(null,) as LinkedAccounts

	const children = await getUserSubmissions(user,) as RedditThing<HistorySubmission>[]
	total = children.length

	children.forEach((value,) => {
		const submission = value.data

		const domainEntry = domains[submission.domain ?? ''] ??= {count: 0,}
		domainEntry.count += 1

		const subredditEntry = subreddits[submission.subreddit] ??= {count: 0, karma: 0,}
		subredditEntry.count += 1
		subredditEntry.karma += submission.score ?? 0

		if (submission.is_self) {
			accumulateTextLinks(textLinkDomains, textLinkAccounts, submission.selftext,)
		} else {
			const account = submissionAccount(submission,)
			if (account) {
				countLinkedAccount(accounts, account,)
			}
		}
	},)

	return {total, domains, subreddits, textLinkDomains, accounts, textLinkAccounts,}
}

/**
 * Fetches and aggregates a user's comment history into subreddit and external link domain frequency tables.
 * @param user The user whose comment history to fetch.
 * @param commentCount Maximum number of comments to retrieve.
 * @returns Total comment count, per-subreddit counts, and external domains linked in comment bodies.
 */
export async function getCommentHistoryData (user: string, commentCount: number,): Promise<CommentHistoryData> {
	const subreddits = Object.create(null,) as Record<string, number>
	const linkDomains = Object.create(null,) as Record<string, {count: number}>
	const linkAccounts = Object.create(null,) as LinkedAccounts

	const children = await getUserComments(user, commentCount,) as RedditThing<CommentData & {body?: string}>[]
	const total = children.length

	children.forEach((comment,) => {
		const {subreddit, body,} = comment.data
		subreddits[subreddit] ??= 0
		subreddits[subreddit] += 1
		accumulateTextLinks(linkDomains, linkAccounts, body,)
	},)

	return {total, subreddits, linkDomains, linkAccounts,}
}
