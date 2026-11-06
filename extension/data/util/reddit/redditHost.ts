/** Reddit host allowlist shared by the background request proxy and the content-side request executor. */

/** Returns `true` if `hostname` is `reddit.com`, `redd.it`, or any subdomain thereof. */
export function isAllowedRedditHost (hostname: string,): boolean {
	return hostname === 'reddit.com'
		|| hostname.endsWith('.reddit.com',)
		|| hostname === 'redd.it'
		|| hostname.endsWith('.redd.it',)
}
