/** Tests for resolving link URLs and oEmbed data to off-site accounts. */

// @vitest-environment node
import {describe, expect, it,} from 'vitest'

import {accountFromOembed, accountFromUrl, countLinkedAccount,} from './accounts'
import type {LinkedAccounts,} from './schema'

/** `[url, "Provider:name"]` pairs that must resolve to that account. */
const recognized: [string, string,][] = [
	// YouTube channel links (videos are left to oEmbed)
	['https://www.youtube.com/@KornVEVO', 'YouTube:KornVEVO',],
	['https://www.youtube.com/@KornVEVO/videos', 'YouTube:KornVEVO',],
	['https://m.youtube.com/@rhino', 'YouTube:rhino',],
	['https://www.youtube.com/channel/UCAUB8xZmHho16u6GKlnLhXA', 'YouTube:UCAUB8xZmHho16u6GKlnLhXA',],
	['https://www.youtube.com/c/SomeChannel', 'YouTube:SomeChannel',],
	['https://www.youtube.com/user/oldname', 'YouTube:oldname',],
	// X / Twitter, including mirrors
	['https://twitter.com/jack/status/20', 'X / Twitter:jack',],
	['https://x.com/jack/status/20', 'X / Twitter:jack',],
	['https://fxtwitter.com/jack/status/20', 'X / Twitter:jack',],
	['https://x.com/some_user_', 'X / Twitter:some_user_',],
	// Instagram
	['https://www.instagram.com/natgeo/', 'Instagram:natgeo',],
	['https://www.instagram.com/some.user_name/', 'Instagram:some.user_name',],
	['https://www.instagram.com/stories/natgeo/123456/', 'Instagram:natgeo',],
	['https://www.instagram.com/natgeo/p/Cxyz123/', 'Instagram:natgeo',],
	// Threads / Bluesky / TikTok
	['https://www.threads.net/@zuck/post/abc', 'Threads:zuck',],
	['https://www.threads.com/@zuck', 'Threads:zuck',],
	['https://bsky.app/profile/someone.bsky.social/post/3k', 'Bluesky:someone.bsky.social',],
	['https://www.tiktok.com/@creator/video/123', 'TikTok:creator',],
	// Streaming
	['https://www.twitch.tv/streamer', 'Twitch:streamer',],
	['https://www.twitch.tv/streamer/clip/SlugName', 'Twitch:streamer',],
	['https://kick.com/streamer', 'Kick:streamer',],
	['https://rumble.com/c/SomeChannel', 'Rumble:SomeChannel',],
	// Tumblr, both URL styles
	['https://staff.tumblr.com/post/123', 'Tumblr:staff',],
	['https://someblog.tumblr.com/post/123/slug', 'Tumblr:someblog',],
	['https://www.tumblr.com/someblog/123456/slug', 'Tumblr:someblog',],
	['https://tumblr.com/someblog/123456', 'Tumblr:someblog',],
	['https://www.tumblr.com/blog/view/someblog/123', 'Tumblr:someblog',],
	// DeviantArt, both URL styles
	['https://www.deviantart.com/artistname/art/Title-123456', 'DeviantArt:artistname',],
	['https://artistname.deviantart.com/art/Title-123456', 'DeviantArt:artistname',],
	// ArtStation
	['https://www.artstation.com/artistname', 'ArtStation:artistname',],
	['https://artistname.artstation.com/projects/AbC123', 'ArtStation:artistname',],
	// Flickr, including NSIDs
	['https://www.flickr.com/photos/someuser/5123456789/', 'Flickr:someuser',],
	['https://www.flickr.com/photos/12345678@N00/5123456789/', 'Flickr:12345678@N00',],
	['https://www.flickr.com/people/someuser/', 'Flickr:someuser',],
	// Blogs and newsletters
	['https://medium.com/@writer/some-post-abc123', 'Medium:writer',],
	['https://writer.medium.com/some-post-abc123', 'Medium:writer',],
	['https://newsletter.substack.com/p/some-post', 'Substack:newsletter',],
	['https://substack.com/@writer', 'Substack:writer',],
	['https://someblog.blogspot.com/2024/01/post.html', 'Blogspot:someblog',],
	['https://someblog.wordpress.com/2024/01/01/post/', 'WordPress.com:someblog',],
	// Music, support, storefronts
	['https://artist.bandcamp.com/album/name', 'Bandcamp:artist',],
	['https://soundcloud.com/artist/track-name', 'SoundCloud:artist',],
	['https://www.patreon.com/creator', 'Patreon:creator',],
	['https://www.patreon.com/c/creator/posts', 'Patreon:creator',],
	['https://ko-fi.com/creator', 'Ko-fi:creator',],
	['https://onlyfans.com/creator', 'OnlyFans:creator',],
	['https://linktr.ee/creator', 'Linktree:creator',],
	['https://www.etsy.com/shop/ShopName', 'Etsy:ShopName',],
	['https://www.etsy.com/de/shop/ShopName', 'Etsy:ShopName',],
]

/** URLs that carry no account name (or are site pages) and must not produce a row. */
const unrecognized = [
	'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	'https://youtu.be/dQw4w9WgXcQ',
	'https://www.youtube.com/shorts/abc123',
	'https://www.youtube.com/playlist?list=PL123',
	'https://twitter.com/i/web/status/20',
	'https://x.com/home',
	'https://x.com/search?q=foo',
	'https://x.com/hashtag/foo',
	'https://www.instagram.com/p/Cxyz123/',
	'https://www.instagram.com/reel/Cxyz123/',
	'https://vm.tiktok.com/ZMabc/',
	'https://www.tiktok.com/t/ZTabc/',
	'https://www.twitch.tv/videos/123456',
	'https://clips.twitch.tv/SlugName',
	'https://rumble.com/v4abc-some-video.html',
	'https://www.tumblr.com/tagged/art',
	'https://www.tumblr.com/dashboard',
	'https://64.media.tumblr.com/abc/s640x960/x.jpg',
	'https://www.deviantart.com/tag/fantasy',
	'https://www.deviantart.com/daily-deviations',
	'https://www.artstation.com/artwork/AbC123',
	'https://flic.kr/p/abc',
	'https://medium.com/some-publication/some-post-abc123',
	'https://open.substack.com/pub/newsletter/p/post',
	'https://daily.bandcamp.com/features/x',
	'https://soundcloud.com/discover',
	'https://on.soundcloud.com/abc',
	'https://www.patreon.com/posts/some-post-123',
	// GitHub is deliberately not an account provider: its links are almost always to repos.
	'https://github.com/someuser/repo',
	'https://someuser.github.io/project/',
	'https://www.etsy.com/listing/123/item',
	'https://www.reddit.com/r/foo',
	'https://example.com/foo',
	'ftp://x.com/jack',
	'not a url',
]

describe('accountFromUrl', () => {
	it.each(recognized,)('resolves %s', (url, expected,) => {
		const account = accountFromUrl(url,)
		expect(account && `${account.provider}:${account.name}`,).toBe(expected,)
	},)

	it.each(unrecognized,)('ignores %s', (url,) => {
		expect(accountFromUrl(url,),).toBeUndefined()
	},)

	it.each([
		['https://twitter.com/Jack/status/1', 'https://x.com/jack',],
		['https://www.tumblr.com/someblog/1', 'https://someblog.tumblr.com/post/2',],
		['https://www.deviantart.com/Artist/art/x-1', 'https://artist.deviantart.com/art/y-2',],
		['https://m.youtube.com/@KornVEVO', 'https://www.youtube.com/@kornvevo/videos',],
	],)('groups %s with %s', (a, b,) => {
		expect(accountFromUrl(a,)?.key,).toBe(accountFromUrl(b,)?.key,)
	},)

	it('keeps case-sensitive channel ids apart', () => {
		expect(accountFromUrl('https://www.youtube.com/channel/UCabc',)?.key,)
			.not.toBe(accountFromUrl('https://www.youtube.com/channel/UCABC',)?.key,)
	})

	it('builds canonical URLs', () => {
		expect(accountFromUrl('https://fxtwitter.com/jack/status/1',)?.url,).toBe('https://x.com/jack',)
		expect(accountFromUrl('https://artist.deviantart.com/art/x',)?.url,).toBe('https://www.deviantart.com/artist',)
		expect(accountFromUrl('https://www.youtube.com/channel/UCabc/videos',)?.url,)
			.toBe('https://www.youtube.com/channel/UCabc',)
	})
})

describe('accountFromOembed', () => {
	it('uses the author name for display and the parsed URL for grouping', () => {
		const account = accountFromOembed({
			author_name: 'Dillinger Escape Plan',
			author_url: 'https://www.youtube.com/@ChuckBillyTotemPoll',
			provider_name: 'YouTube',
		},)
		expect(account,).toMatchObject({
			provider: 'YouTube',
			name: 'Dillinger Escape Plan',
			handle: 'ChuckBillyTotemPoll',
			url: 'https://www.youtube.com/@ChuckBillyTotemPoll',
		},)
		expect(account?.key,).toBe(accountFromUrl('https://www.youtube.com/@chuckbillytotempoll',)?.key,)
	})

	it('falls back to the raw author URL for providers without a rule', () => {
		expect(accountFromOembed({
			author_name: 'Someone',
			author_url: 'http://vimeo.com/someone',
			provider_name: 'Vimeo',
		},),).toEqual({
			provider: 'Vimeo',
			handle: 'https://vimeo.com/someone',
			name: 'Someone',
			url: 'https://vimeo.com/someone',
			key: 'https://vimeo.com/someone',
		},)
	})

	it('returns undefined without an author URL', () => {
		expect(accountFromOembed({author_name: 'x', provider_name: 'YouTube',},),).toBeUndefined()
		expect(accountFromOembed({author_url: 'not a url',},),).toBeUndefined()
	})
})

describe('countLinkedAccount', () => {
	it('counts repeats and upgrades a handle-only name to the oEmbed author name', () => {
		const accounts: LinkedAccounts = Object.create(null,)
		countLinkedAccount(accounts, accountFromUrl('https://www.youtube.com/@KornVEVO',)!,)
		countLinkedAccount(
			accounts,
			accountFromOembed({author_name: 'Korn', author_url: 'https://www.youtube.com/@KornVEVO',},)!,
		)
		countLinkedAccount(accounts, accountFromUrl('https://m.youtube.com/@kornvevo',)!,)

		expect(Object.values(accounts,),).toEqual([
			{provider: 'YouTube', name: 'Korn', url: 'https://www.youtube.com/@KornVEVO', count: 3,},
		],)
	})
})
