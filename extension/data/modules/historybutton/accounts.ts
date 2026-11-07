/** Resolves link URLs and oEmbed data to the off-site accounts (channels, profiles, blogs) that own them. */
import {
	type AccountRule,
	accountSpecs,
	commonReservedPathSegments,
	defaultAccountNamePattern,
	type LinkedAccounts,
	type PathAccountRule,
	type SubdomainAccountRule,
} from './schema'

/** An account recognized from a single URL, before counting. */
export interface ResolvedAccount {
	provider: string
	/** Name as it appears in the URL. */
	handle: string
	/** Display name: the oEmbed author name when known, otherwise the handle. */
	name: string
	/** Canonical account URL. */
	url: string
	/** Grouping key; identical for every URL variant of the same account. */
	key: string
}

/** The subset of Reddit's `media.oembed` object used to identify the uploader of embedded media. */
export interface OembedData {
	author_name?: string
	author_url?: string
	provider_name?: string
}

const localeSegment = /^[a-z]{2}(-[a-z]{2})?$/i

/** Lowercases a hostname and drops a leading `www.` so rules can list bare domains. */
function normalizeHost (hostname: string,): string {
	return hostname.toLowerCase().replace(/^www\./, '',)
}

/** Returns the label directly in front of `rule.base`, or undefined if the host is not an account subdomain. */
function matchSubdomain (rule: SubdomainAccountRule, host: string,): string | undefined {
	if (!host.endsWith(`.${rule.base}`,)) { return }
	const labels = host.slice(0, -rule.base.length - 1,).split('.',)
	const name = labels[labels.length - 1]
	if (!name || rule.exclude?.includes(name,)) { return }
	return name
}

/** Splits a pathname into decoded, non-empty segments; undefined if any segment is malformed. */
function pathSegments (pathname: string,): string[] | undefined {
	try {
		return pathname.split('/',).filter(Boolean,).map((segment,) => decodeURIComponent(segment,))
	} catch {
		return undefined
	}
}

/** Returns the account name from the URL path, or undefined if the path is not an account URL on this site. */
function matchPath (rule: PathAccountRule, host: string, pathname: string,): string | undefined {
	if (!rule.hosts.includes(host,)) { return }
	let segments = pathSegments(pathname,)
	if (!segments) { return }

	if (
		rule.localePrefix && rule.prefix?.[0] && segments[1] === rule.prefix[0]
		&& localeSegment.test(segments[0] ?? '',)
	) {
		segments = segments.slice(1,)
	}
	for (const expected of rule.prefix ?? []) {
		if (segments.shift()?.toLowerCase() !== expected) { return }
	}

	let name = segments[0]
	if (!name) { return }
	if (rule.atRequired) {
		if (!name.startsWith('@',)) { return }
		name = name.slice(1,)
	}
	if (!rule.prefix) {
		const lower = name.toLowerCase()
		if (commonReservedPathSegments.includes(lower,) || rule.reserved?.includes(lower,)) { return }
	}
	return name
}

/** Applies one rule to a parsed URL. */
function matchRule (rule: AccountRule, url: URL,): string | undefined {
	const host = normalizeHost(url.hostname,)
	const name = rule.kind === 'subdomain' ? matchSubdomain(rule, host,) : matchPath(rule, host, url.pathname,)
	if (!name || !(rule.namePattern ?? defaultAccountNamePattern).test(name,)) { return }
	return name
}

/**
 * Resolves a URL to the account that owns it, using {@link accountSpecs}.
 * @returns The account, or undefined for unrecognized sites and for site URLs that carry no account name
 * (short links, single posts without an author segment, site pages).
 */
export function accountFromUrl (rawUrl: string,): ResolvedAccount | undefined {
	let url: URL
	try {
		url = new URL(rawUrl,)
	} catch {
		return undefined
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') { return }

	for (const spec of accountSpecs) {
		for (const rule of spec.rules) {
			const name = matchRule(rule, url,)
			if (name) {
				const canonical = (rule.url ?? spec.url).replace('{name}', name,)
				return {
					provider: spec.provider,
					handle: name,
					name,
					url: canonical,
					key: rule.caseSensitive ? canonical : canonical.toLowerCase(),
				}
			}
		}
	}
	return undefined
}

/**
 * Resolves Reddit oEmbed data to the account that uploaded the media. The author URL goes through
 * {@link accountFromUrl} so video posts group with direct links to the same channel; the oEmbed
 * author name is preferred for display because handles can differ from channel names.
 * @returns The account, or undefined when the oEmbed data has no usable author URL.
 */
export function accountFromOembed (oembed: OembedData,): ResolvedAccount | undefined {
	if (!oembed.author_url) { return }
	const resolved = accountFromUrl(oembed.author_url,)
	if (resolved) {
		return oembed.author_name ? {...resolved, name: oembed.author_name,} : resolved
	}

	let url: URL
	try {
		url = new URL(oembed.author_url,)
	} catch {
		return undefined
	}
	url.protocol = 'https:'
	return {
		provider: oembed.provider_name || normalizeHost(url.hostname,),
		handle: url.href,
		name: oembed.author_name || url.href,
		url: url.href,
		key: url.href,
	}
}

/**
 * Counts one occurrence of `account` in `accounts`. A row first seen as a bare URL handle takes the
 * oEmbed author name when a later occurrence of the same account brings one.
 */
export function countLinkedAccount (accounts: LinkedAccounts, account: ResolvedAccount,): void {
	const existing = accounts[account.key]
	if (!existing) {
		accounts[account.key] = {provider: account.provider, name: account.name, url: account.url, count: 1,}
		return
	}
	existing.count++
	if (existing.name === account.handle) {
		existing.name = account.name
	}
}
