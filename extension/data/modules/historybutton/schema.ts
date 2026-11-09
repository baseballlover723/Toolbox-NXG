/** Data shapes for user history information fetched and displayed by the History Button module. */

/** Basic Reddit account info for a user. */
export interface UserInfo {
	/** Account creation date; pass through {@linkcode util/data/time!niceDateDiff} for a human-readable age. */
	createdAt: Date
	submissionKarma: number
	commentKarma: number
}

/** An off-site account (YouTube channel, X profile, blog, ...) seen in a user's links, with how often it appeared. */
export interface LinkedAccount {
	/** Site name shown in the provider column, e.g. `YouTube`. */
	provider: string
	/** Display name: the oEmbed author name when available, otherwise the name parsed from the URL. */
	name: string
	/** Canonical URL of the account. */
	url: string
	count: number
}

/** Linked accounts keyed by a grouping key shared by every URL variant of the same account. */
export type LinkedAccounts = Record<string, LinkedAccount>

/** Aggregated submission history for a user, broken down by domain and subreddit. */
export interface SubmissionHistoryData {
	/** Total number of submissions retrieved. */
	total: number
	/** Submission counts keyed by submission domain. */
	domains: Record<string, {count: number}>
	/** Submission counts and total karma keyed by subreddit. */
	subreddits: Record<string, {count: number; karma: number}>
	/** External domains linked in selfpost bodies, keyed by hostname. */
	textLinkDomains: Record<string, {count: number}>
	/** Off-site accounts the user submitted links from (oEmbed authors and recognized account URLs). */
	accounts: LinkedAccounts
	/** Off-site accounts linked in selfpost bodies. */
	textLinkAccounts: LinkedAccounts
}

/** Aggregated comment history for a user, broken down by subreddit and linked domain. */
export interface CommentHistoryData {
	/** Total number of comments retrieved. */
	total: number
	/** Comment counts keyed by subreddit. */
	subreddits: Record<string, number>
	/** External domains linked in comment bodies. */
	linkDomains: Record<string, {count: number}>
	/** Off-site accounts linked in comment bodies. */
	linkAccounts: LinkedAccounts
}

/** Fields shared by every account rule. */
interface AccountRuleBase {
	/** Keep the name's case in the grouping key (e.g. YouTube `UC...` channel ids are case-sensitive). */
	caseSensitive?: boolean
	/** Pattern the extracted name must match; defaults to {@link defaultAccountNamePattern}. */
	namePattern?: RegExp
	/** Overrides the spec's canonical URL template for names matched by this rule. */
	url?: string
}

/** Account name is the label directly in front of `base`, e.g. `name.blogspot.com`. */
export interface SubdomainAccountRule extends AccountRuleBase {
	kind: 'subdomain'
	base: string
	/** Subdomains that belong to the site itself rather than to an account. */
	exclude?: readonly string[]
}

/** Account name is a path segment on one of `hosts`, e.g. `x.com/name/status/1`. */
export interface PathAccountRule extends AccountRuleBase {
	kind: 'path'
	/** Hostnames without a leading `www.`. */
	hosts: readonly string[]
	/** Fixed leading segments before the name, e.g. `['photos']` for `flickr.com/photos/name`. */
	prefix?: readonly string[]
	/** The name segment must start with `@` (stripped from the result). */
	atRequired?: boolean
	/** First segments that are site pages, not accounts. Only consulted for rules without a `prefix`. */
	reserved?: readonly string[]
	/** Allow a leading locale segment before the prefix, e.g. `etsy.com/de/shop/name`. */
	localePrefix?: boolean
}

/** One rule for pulling an account name out of a URL. */
export type AccountRule = SubdomainAccountRule | PathAccountRule

/** How to recognize accounts on one site. Rules are tried in order; the first match wins. */
export interface AccountSpec {
	provider: string
	/** Canonical account URL template; `{name}` is replaced with the extracted name. */
	url: string
	rules: readonly AccountRule[]
}

/** Default pattern an extracted account name must match. */
export const defaultAccountNamePattern = /^[\w.-]+$/

/** First path segments that are site pages on almost every supported site; applies to rules without a prefix. */
export const commonReservedPathSegments: readonly string[] = [
	'about',
	'blog',
	'careers',
	'contact',
	'explore',
	'help',
	'home',
	'jobs',
	'legal',
	'login',
	'logout',
	'press',
	'pricing',
	'privacy',
	'register',
	'search',
	'settings',
	'share',
	'signup',
	'terms',
	'tos',
]

/** Flickr names may be NSIDs such as `12345678@N00`. */
const flickrNamePattern = /^[\w.-]+(@N\d+)?$/

/** Hosts serving YouTube channel pages. */
const youtubeHosts = ['youtube.com', 'm.youtube.com',]

/**
 * Sites whose account can be read from a link URL. YouTube videos are not covered here: their
 * channel comes from the oEmbed data Reddit attaches to submissions, and these rules catch direct
 * channel links. Short links (youtu.be, vm.tiktok.com, flic.kr, ...) carry no account name and are
 * deliberately not matched.
 */
export const accountSpecs: readonly AccountSpec[] = [
	{
		provider: 'YouTube',
		url: 'https://www.youtube.com/@{name}',
		rules: [
			{kind: 'path', hosts: [...youtubeHosts, 'music.youtube.com',], atRequired: true,},
			{
				kind: 'path',
				hosts: youtubeHosts,
				prefix: ['channel',],
				caseSensitive: true,
				url: 'https://www.youtube.com/channel/{name}',
			},
			{kind: 'path', hosts: youtubeHosts, prefix: ['c',], url: 'https://www.youtube.com/c/{name}',},
			{kind: 'path', hosts: youtubeHosts, prefix: ['user',], url: 'https://www.youtube.com/user/{name}',},
		],
	},
	{
		provider: 'X / Twitter',
		url: 'https://x.com/{name}',
		rules: [{
			kind: 'path',
			hosts: [
				'x.com',
				'mobile.x.com',
				'twitter.com',
				'mobile.twitter.com',
				'fxtwitter.com',
				'vxtwitter.com',
				'fixupx.com',
				'fixvx.com',
			],
			reserved: [
				'account',
				'communities',
				'compose',
				'download',
				'hashtag',
				'i',
				'intent',
				'lists',
				'messages',
				'notifications',
				'status',
				'statuses',
			],
		},],
	},
	{
		provider: 'Instagram',
		url: 'https://www.instagram.com/{name}',
		rules: [
			{kind: 'path', hosts: ['instagram.com',], prefix: ['stories',],},
			{
				kind: 'path',
				hosts: ['instagram.com',],
				reserved: [
					'accounts',
					'challenge',
					'developer',
					'direct',
					'emails',
					'p',
					'reel',
					'reels',
					'stories',
					'tv',
					'web',
				],
			},
		],
	},
	{
		provider: 'Threads',
		url: 'https://www.threads.com/@{name}',
		rules: [{kind: 'path', hosts: ['threads.net', 'threads.com',], atRequired: true,},],
	},
	{
		provider: 'Bluesky',
		url: 'https://bsky.app/profile/{name}',
		rules: [{kind: 'path', hosts: ['bsky.app',], prefix: ['profile',],},],
	},
	{
		provider: 'TikTok',
		url: 'https://www.tiktok.com/@{name}',
		rules: [{kind: 'path', hosts: ['tiktok.com', 'm.tiktok.com',], atRequired: true,},],
	},
	{
		provider: 'Twitch',
		url: 'https://www.twitch.tv/{name}',
		rules: [{
			kind: 'path',
			hosts: ['twitch.tv', 'm.twitch.tv',],
			reserved: [
				'directory',
				'downloads',
				'drops',
				'inventory',
				'moderator',
				'p',
				'prime',
				'subscriptions',
				'turbo',
				'videos',
				'wallet',
			],
		},],
	},
	{
		provider: 'Kick',
		url: 'https://kick.com/{name}',
		rules: [{
			kind: 'path',
			hosts: ['kick.com',],
			reserved: ['browse', 'categories', 'community-guidelines', 'following', 'video',],
		},],
	},
	{
		provider: 'Rumble',
		url: 'https://rumble.com/c/{name}',
		rules: [
			{kind: 'path', hosts: ['rumble.com',], prefix: ['c',],},
			{kind: 'path', hosts: ['rumble.com',], prefix: ['user',], url: 'https://rumble.com/user/{name}',},
		],
	},
	{
		provider: 'Tumblr',
		url: 'https://www.tumblr.com/{name}',
		rules: [
			{kind: 'subdomain', base: 'tumblr.com', exclude: ['api', 'assets', 'help', 'media', 'static', 'www',],},
			{kind: 'path', hosts: ['tumblr.com',], prefix: ['blog', 'view',],},
			{
				kind: 'path',
				hosts: ['tumblr.com',],
				reserved: [
					'apps',
					'communities',
					'dashboard',
					'docs',
					'following',
					'inbox',
					'likes',
					'new',
					'policy',
					'post',
					'reblog',
					'safe-mode',
					'tag',
					'tagged',
				],
			},
		],
	},
	{
		provider: 'DeviantArt',
		url: 'https://www.deviantart.com/{name}',
		rules: [
			{kind: 'subdomain', base: 'deviantart.com', exclude: ['about', 'chat', 'forum', 'help', 'shop', 'www',],},
			{
				kind: 'path',
				hosts: ['deviantart.com',],
				reserved: [
					'core-membership',
					'daily-deviations',
					'developers',
					'deviation',
					'groups',
					'join',
					'journals',
					'notifications',
					'popular',
					'shop',
					'status-update',
					'tag',
					'team',
					'topic',
					'users',
					'watch',
				],
			},
		],
	},
	{
		provider: 'ArtStation',
		url: 'https://www.artstation.com/{name}',
		rules: [
			{kind: 'subdomain', base: 'artstation.com', exclude: ['cdna', 'cdnb', 'help', 'magazine', 'www',],},
			{
				kind: 'path',
				hosts: ['artstation.com',],
				reserved: [
					'a',
					'artwork',
					'blogs',
					'challenges',
					'channels',
					'contests',
					'guides',
					'learning',
					'marketplace',
					'prints',
					'users',
				],
			},
		],
	},
	{
		provider: 'Flickr',
		url: 'https://www.flickr.com/photos/{name}',
		rules: [
			{
				kind: 'path',
				hosts: ['flickr.com',],
				prefix: ['photos',],
				caseSensitive: true,
				namePattern: flickrNamePattern,
			},
			{
				kind: 'path',
				hosts: ['flickr.com',],
				prefix: ['people',],
				caseSensitive: true,
				namePattern: flickrNamePattern,
			},
		],
	},
	{
		provider: 'Medium',
		url: 'https://medium.com/@{name}',
		rules: [
			{
				kind: 'subdomain',
				base: 'medium.com',
				exclude: ['about', 'blog', 'cdn-images-1', 'help', 'miro', 'policy', 'www',],
			},
			{kind: 'path', hosts: ['medium.com',], atRequired: true,},
		],
	},
	{
		provider: 'Substack',
		url: 'https://{name}.substack.com',
		rules: [
			{
				kind: 'subdomain',
				base: 'substack.com',
				exclude: ['cdn', 'on', 'open', 'substackcdn', 'support', 'www',],
			},
			{kind: 'path', hosts: ['substack.com',], atRequired: true, url: 'https://substack.com/@{name}',},
		],
	},
	{
		provider: 'Blogspot',
		url: 'https://{name}.blogspot.com',
		rules: [{kind: 'subdomain', base: 'blogspot.com', exclude: ['www',],},],
	},
	{
		provider: 'WordPress.com',
		url: 'https://{name}.wordpress.com',
		rules: [{
			kind: 'subdomain',
			base: 'wordpress.com',
			exclude: ['developer', 'en', 'public-api', 's0', 's1', 's2', 'wordpress', 'www',],
		},],
	},
	{
		provider: 'Bandcamp',
		url: 'https://{name}.bandcamp.com',
		rules: [{kind: 'subdomain', base: 'bandcamp.com', exclude: ['blog', 'daily', 'f4', 'get', 'www',],},],
	},
	{
		provider: 'SoundCloud',
		url: 'https://soundcloud.com/{name}',
		rules: [{
			kind: 'path',
			hosts: ['soundcloud.com', 'm.soundcloud.com',],
			reserved: [
				'artists',
				'charts',
				'discover',
				'feed',
				'imprint',
				'messages',
				'mobile',
				'notifications',
				'pages',
				'people',
				'pro',
				'stream',
				'tags',
				'terms-of-use',
				'upload',
				'you',
			],
		},],
	},
	{
		provider: 'Patreon',
		url: 'https://www.patreon.com/{name}',
		rules: [
			{kind: 'path', hosts: ['patreon.com',], prefix: ['c',],},
			{kind: 'path', hosts: ['patreon.com',], prefix: ['join',],},
			{
				kind: 'path',
				hosts: ['patreon.com',],
				reserved: [
					'apps',
					'c',
					'checkout',
					'creators',
					'join',
					'library',
					'membership',
					'messages',
					'notifications',
					'policy',
					'posts',
					'user',
				],
			},
		],
	},
	{
		provider: 'Ko-fi',
		url: 'https://ko-fi.com/{name}',
		rules: [{
			kind: 'path',
			hosts: ['ko-fi.com',],
			reserved: ['account', 'album', 'explore-creators', 'i', 'manage', 'post', 's', 'shop',],
		},],
	},
	{
		provider: 'OnlyFans',
		url: 'https://onlyfans.com/{name}',
		rules: [{
			kind: 'path',
			hosts: ['onlyfans.com',],
			reserved: ['action', 'bookmarks', 'chats', 'lists', 'my', 'notifications', 'posts', 'subscriptions',],
		},],
	},
	{
		provider: 'Linktree',
		url: 'https://linktr.ee/{name}',
		rules: [{kind: 'path', hosts: ['linktr.ee',], reserved: ['admin', 'marketplace', 's',],},],
	},
	{
		provider: 'Etsy',
		url: 'https://www.etsy.com/shop/{name}',
		rules: [{kind: 'path', hosts: ['etsy.com',], prefix: ['shop',], localePrefix: true,},],
	},
]
