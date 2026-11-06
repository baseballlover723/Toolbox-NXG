/** Tests for the reddit host allowlist. */

import {describe, expect, it,} from 'vitest'

import {isAllowedRedditHost,} from './redditHost'

describe('isAllowedRedditHost', () => {
	it('allows reddit.com and redd.it hosts only', () => {
		expect(isAllowedRedditHost('reddit.com',),).toBe(true,)
		expect(isAllowedRedditHost('old.reddit.com',),).toBe(true,)
		expect(isAllowedRedditHost('redd.it',),).toBe(true,)
		expect(isAllowedRedditHost('v.redd.it',),).toBe(true,)
		expect(isAllowedRedditHost('notreddit.com',),).toBe(false,)
		expect(isAllowedRedditHost('evilredd.it',),).toBe(false,)
	})
})
