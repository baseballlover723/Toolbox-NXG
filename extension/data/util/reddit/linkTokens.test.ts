/** Tests for the subreddit link tokens and their round trip through the 6.x mirror. */

import {describe, expect, it,} from 'vitest'
import {replaceTokens,} from '../data/string'
import {expandLinkTokens, legacyToLinkTokens, linkTokensToLegacy,} from './linkTokens'

describe('expandLinkTokens', () => {
	it('expands {modmail} and {wiki: page#anchor} for the subreddit', () => {
		expect(expandLinkTokens('[mods]({modmail}) and [rules]({wiki: rules#wiki_image_posts})', 'example',),).toBe(
			'[mods](https://www.reddit.com/message/compose?to=/r/example) and '
				+ '[rules](https://www.reddit.com/r/example/wiki/rules#wiki_image_posts)',
		)
	})

	it('is case-insensitive, tolerates spacing, and drops a leading slash from the page', () => {
		expect(expandLinkTokens('{ModMail} {WIKI:/faq/posting }', 'x',),)
			.toBe('https://www.reddit.com/message/compose?to=/r/x https://www.reddit.com/r/x/wiki/faq/posting',)
	})

	it('leaves the tokens alone without a subreddit, and a page with spaces literal', () => {
		expect(expandLinkTokens('{modmail}', '',),).toBe('{modmail}',)
		expect(expandLinkTokens('{wiki: two words}', 'x',),).toBe('{wiki: two words}',)
	})
})

describe('replaceTokens', () => {
	it('expands link tokens from info.subreddit alongside the other tokens', () => {
		expect(replaceTokens({subreddit: 'example', author: 'u',}, 'Hi {author}, see {wiki: rules}',),)
			.toBe('Hi u, see https://www.reddit.com/r/example/wiki/rules',)
	})

	it('does not expand a link token arriving inside a substituted value', () => {
		expect(replaceTokens({subreddit: 'example', title: '{modmail}',}, '{title}',),).toBe('{modmail}',)
	})
})

describe('mirror round trip', () => {
	it('writes URLs 6.x can fill in, and reads them back as tokens', () => {
		const text = 'Ask [the mods]({modmail}); see {wiki: rules#wiki_images.2C_gifs.2C_and_videos}.'
		const legacy = linkTokensToLegacy(text,)
		expect(legacy,).toBe(
			'Ask [the mods](https://www.reddit.com/message/compose?to=/r/{subreddit}); see '
				+ 'https://www.reddit.com/r/{subreddit}/wiki/rules#wiki_images.2C_gifs.2C_and_videos.',
		)
		expect(legacyToLinkTokens(legacy,),).toBe(text,)
	})

	it('leaves a compose link with a subject, and links to other subreddits, alone', () => {
		const subject = 'https://www.reddit.com/message/compose?to=/r/{subreddit}&subject=Appeal'
		expect(legacyToLinkTokens(subject,),).toBe(subject,)
		expect(legacyToLinkTokens('https://www.reddit.com/r/other/wiki/rules',),)
			.toBe('https://www.reddit.com/r/other/wiki/rules',)
	})
})
