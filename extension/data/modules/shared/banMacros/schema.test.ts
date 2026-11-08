/** Tests for the named ban macro helpers: token resolution, limits, and duration clamping. */

import {describe, expect, it,} from 'vitest'

import {clampBanDays, maxBanMacroMessage, maxBanMacroNote, resolveBanMacro, type SavedBanMacro,} from './schema'

/** Builds a macro with the given overrides. */
function macro (overrides: Partial<SavedBanMacro> = {},): SavedBanMacro {
	return {title: 'Spam', note: '', message: '', permanent: false, days: 7, ...overrides,}
}

describe('resolveBanMacro', () => {
	it('substitutes tokens in the note and message and leaves unknown tokens as written', () => {
		const resolved = resolveBanMacro(
			macro({note: 'spam by {author}', message: 'Banned from r/{subreddit} for {url} {nope}',},),
			{author: 'alice', subreddit: 'pics', url: 'https://x',},
		)

		expect(resolved.note,).toBe('spam by alice',)
		expect(resolved.message,).toBe('Banned from r/pics for https://x {nope}',)
	})

	it('truncates to the Reddit limits after substitution', () => {
		const resolved = resolveBanMacro(
			macro({note: '{body}', message: '{body}',},),
			{body: 'x'.repeat(5000,),},
		)

		expect(resolved.note,).toHaveLength(maxBanMacroNote,)
		expect(resolved.message,).toHaveLength(maxBanMacroMessage,)
	})

	it('passes the permanent flag through and clamps the day count', () => {
		expect(resolveBanMacro(macro({permanent: true, days: 0,},), {},),).toMatchObject({permanent: true, days: 1,},)
		expect(resolveBanMacro(macro({days: 30,},), {},).days,).toBe(30,)
	})
})

describe('clampBanDays', () => {
	it('keeps the value within 1-999 and falls back to 7 for garbage', () => {
		expect(clampBanDays(0,),).toBe(1,)
		expect(clampBanDays(1200,),).toBe(999,)
		expect(clampBanDays(3.7,),).toBe(3,)
		expect(clampBanDays('5',),).toBe(7,)
		expect(clampBanDays(Number.NaN,),).toBe(7,)
	})
})
