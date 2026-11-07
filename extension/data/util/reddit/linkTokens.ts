/** Subreddit link tokens (`{modmail}`, `{wiki: page}`) and their round trip through the 6.x config mirror. */

/**
 * The host every link token points at. Messages are read on old Reddit, new Reddit, the
 * apps, and in modmail, so links are absolute and on the canonical host rather than
 * relative to whichever frontend the moderator happens to be using.
 */
const linkHost = 'https://www.reddit.com'

/** Matches a `{modmail}` token (case-insensitive, like every substitution token). */
const modmailTokenRe = /\{modmail\}/gi

/**
 * Characters a wiki page path may hold in a link token: anything except whitespace, the
 * braces that delimit tokens, and the brackets and parens that delimit markdown links.
 */
const pageChars = String.raw`[^\s{}()[\]<>]`

/** Matches a `{wiki: page#anchor}` token; group 1 is the page path (with any anchor). */
const wikiTokenRe = new RegExp(String.raw`\{wiki\s*:\s*(${pageChars}+)\s*\}`, 'gi',)

/**
 * Matches the URL a `{modmail}` token down-converts to. It must not run on into a query
 * parameter, or a hand-written compose link with a subject would lose its subject.
 */
const legacyModmailRe = /https:\/\/www\.reddit\.com\/message\/compose\?to=\/r\/\{subreddit\}(?![\w&%=])/gi

/**
 * Matches the URL a `{wiki: page}` token down-converts to; group 1 is the page path. The
 * path stops short of trailing sentence punctuation, so `see {wiki: rules}.` comes back
 * with its full stop outside the token.
 */
const legacyWikiRe = new RegExp(
	String.raw`https://www\.reddit\.com/r/\{subreddit\}/wiki/(${pageChars}*[^\s{}()[\]<>.,;:!?])`,
	'gi',
)

/** The bare (argument-free) link token names, for callers that check which `{name}`s resolve. */
export const linkTokenNames = ['modmail',] as const

/** The URL of the form for sending modmail to a subreddit's moderators. */
export function modmailComposeUrl (subreddit: string,): string {
	return `${linkHost}/message/compose?to=/r/${subreddit}`
}

/**
 * The URL of a page on a subreddit's wiki.
 * @param subreddit The subreddit name.
 * @param page The page path as written in the token, optionally with a `#anchor`.
 */
export function wikiPageUrl (subreddit: string, page: string,): string {
	return `${linkHost}/r/${subreddit}/wiki/${page.replace(/^\/+/, '',)}`
}

/**
 * Expands every `{modmail}` and `{wiki: page}` token in the text into its link for the
 * given subreddit. Text without a subreddit to link to is returned unchanged, so the
 * tokens stay visible rather than becoming links to nowhere.
 * @param content The text to expand.
 * @param subreddit The subreddit the links point at.
 */
export function expandLinkTokens (content: string, subreddit: string,): string {
	if (!subreddit) { return content }
	return content
		.replace(modmailTokenRe, () => modmailComposeUrl(subreddit,),)
		.replace(wikiTokenRe, (_match, page: string,) => wikiPageUrl(subreddit, page,),)
}

/**
 * Down-converts link tokens for the 6.x config mirror. 6.x knows neither token but does
 * substitute `{subreddit}`, so each becomes its URL with `{subreddit}` left for 6.x to
 * fill in, and the link works there unchanged.
 * @param text Text in NXG form.
 */
export function linkTokensToLegacy (text: string,): string {
	return expandLinkTokens(text, '{subreddit}',)
}

/**
 * Up-converts the URLs {@link linkTokensToLegacy} writes back into link tokens, so the
 * mirror round trip is exact. A hand-written link of the same shape becomes a token as
 * well, which sends the identical link.
 * @param text Text read from the 6.x mirror (or written by hand in NXG).
 */
export function legacyToLinkTokens (text: string,): string {
	if (!text.includes('{subreddit}',)) { return text }
	return text
		.replace(legacyModmailRe, '{modmail}',)
		.replace(legacyWikiRe, (_match, page: string,) => `{wiki: ${page}}`,)
}
