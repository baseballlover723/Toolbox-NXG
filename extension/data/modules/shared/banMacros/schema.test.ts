/** Tests for the named ban macro helpers: token resolution, limits, and duration clamping. */

import {describe, expect, it,} from 'vitest'

import {replaceTokens,} from '../../../util/data/string'

import {
	banTokenInfo,
	clampBanDays,
	maxBanMacroMessage,
	maxBanMacroNote,
	resolveBanDefaults,
	resolveBanMacro,
	type SavedBanMacro,
	unresolvedBanTokens,
} from './schema'

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

describe('resolveBanMacro removeAll', () => {
	it('keeps remove-all only on a permanent macro', () => {
		expect(resolveBanMacro(macro({permanent: true, removeAll: true,},), {},).removeAll,).toBe(true,)
		expect(resolveBanMacro(macro({permanent: false, removeAll: true,},), {},).removeAll,).toBe(false,)
		expect(resolveBanMacro(macro({permanent: true,},), {},).removeAll,).toBe(false,)
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

describe('banTokenInfo', () => {
	it('fills item tokens from the item and leaves out empty ones', () => {
		const info = banTokenInfo(
			{author: 'alice', subreddit: 'pics', mod: 'bob',},
			{kind: 'comment', title: '', url: 'https://x', body: 'hi',},
		)
		expect(info,).toEqual({
			author: 'alice',
			subreddit: 'pics',
			mod: 'bob',
			kind: 'comment',
			url: 'https://x',
			permalink: 'https://x',
			body: 'hi',
		},)
	})

	it('fills {permalink} in a ban message the same as {url}', () => {
		const info = banTokenInfo({author: 'alice', subreddit: 'pics', mod: 'bob',}, {
			url: 'https://x',
			permalink: 'https://p',
		},)
		expect(replaceTokens(info, 'see {permalink}',),).toBe('see https://p',)
		expect(unresolvedBanTokens(replaceTokens(info, 'see {permalink}',),),).toEqual([],)
		expect(banTokenInfo({author: 'a', subreddit: 's', mod: 'm',}, {url: 'https://x',},).permalink,).toBe(
			'https://x',
		)
	})

	it('has no item tokens without an item', () => {
		expect(Object.keys(banTokenInfo({author: 'a', subreddit: 's', mod: 'm',},),),)
			.toEqual(['author', 'subreddit', 'mod',],)
	})
})

describe('unresolvedBanTokens', () => {
	it('names the tokens still written out, in declaration order', () => {
		expect(unresolvedBanTokens('see {URL} and {title} for {author} at {permalink}',),).toEqual(
			['{author}', '{title}', '{url}', '{permalink}',],
		)
		expect(unresolvedBanTokens('all filled in',),).toEqual([],)
	})
})

describe('resolveBanDefaults', () => {
	it('substitutes known tokens and keeps unknown ones visible', () => {
		const tokens = banTokenInfo({author: 'alice', subreddit: 'pics', mod: 'bob',},)
		const resolved = resolveBanDefaults(
			{
				banNote: 'by {mod}',
				banMessage: 'Bye {author}: {url}',
				defaultBanPermanent: false,
				defaultBanDuration: 3,
			},
			tokens,
		)
		expect(resolved,).toEqual({note: 'by bob', message: 'Bye alice: {url}', permanent: false, days: 3,},)
	})

	it('reads an unset permanent flag as permanent and an empty config as no defaults', () => {
		expect(resolveBanDefaults({banMessage: '',}, {},).permanent,).toBe(true,)
		expect(resolveBanDefaults(null, {},),).toEqual({note: '', message: '', permanent: false,},)
	})
})
