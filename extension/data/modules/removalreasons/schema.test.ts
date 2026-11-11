/** Tests for the removal reasons display-mode and ban-default helpers. */
import {describe, expect, it,} from 'vitest'

import {appliesToKind, defaultRemovalBan, fallbackBanDays, isDrawerDisplayMode, resolveDisplayMode,} from './schema'

describe('appliesToKind', () => {
	it('includes everywhere when unscoped or scoped to all', () => {
		expect(appliesToKind(undefined, 'submission',),).toBe(true,)
		expect(appliesToKind(undefined, 'comment',),).toBe(true,)
		expect(appliesToKind('all', 'comment',),).toBe(true,)
	})

	it('limits a posts scope to submissions', () => {
		expect(appliesToKind('posts', 'submission',),).toBe(true,)
		expect(appliesToKind('posts', 'comment',),).toBe(false,)
	})

	it('limits a comments scope to comments', () => {
		expect(appliesToKind('comments', 'submission',),).toBe(false,)
		expect(appliesToKind('comments', 'comment',),).toBe(true,)
	})
})

describe('resolveDisplayMode', () => {
	it('follows the setting when the classic look is off', () => {
		expect(resolveDisplayMode('Drawer', false,),).toBe('Drawer',)
		expect(resolveDisplayMode('Popup (legacy)', false,),).toBe('Popup (legacy)',)
	})

	it('always uses the popup when the classic look is on', () => {
		expect(resolveDisplayMode('Drawer', true,),).toBe('Popup (legacy)',)
		expect(resolveDisplayMode('Popup (legacy)', true,),).toBe('Popup (legacy)',)
	})

	it('treats a missing or unrecognized setting as the popup, as isDrawerDisplayMode does', () => {
		expect(resolveDisplayMode(undefined, false,),).toBe('Popup (legacy)',)
		expect(isDrawerDisplayMode(resolveDisplayMode('drawer', false,),),).toBe(true,)
	})
})

describe('defaultRemovalBan', () => {
	it('uses the Ban settings temporary duration', () => {
		expect(defaultRemovalBan({banMacros: {defaultBanPermanent: false, defaultBanDuration: 3,},},),)
			.toEqual({permanent: false, days: 3,},)
	})

	it('starts permanent when Ban settings default to permanent', () => {
		expect(defaultRemovalBan({banMacros: {defaultBanPermanent: true, defaultBanDuration: 0,},},),)
			.toEqual({permanent: true, days: fallbackBanDays,},)
	})

	it('reads an unset permanent flag as permanent, like the mod button', () => {
		expect(defaultRemovalBan({banMacros: {defaultBanDuration: 0,},},),)
			.toEqual({permanent: true, days: fallbackBanDays,},)
	})

	it.each([
		['no config', undefined,],
		['no ban macros', {banMacros: null,},],
	],)('starts at a 7 day temporary ban with %s', (_label, config,) => {
		expect(defaultRemovalBan(config,),).toEqual({permanent: false, days: fallbackBanDays,},)
	},)

	it.each([
		['an unset duration', 0,],
		['an out-of-range duration', 1000,],
		['a fractional duration', 2.5,],
	],)('falls back to 7 days with %s', (_label, defaultBanDuration,) => {
		expect(defaultRemovalBan({banMacros: {defaultBanPermanent: false, defaultBanDuration,},},),)
			.toEqual({permanent: false, days: fallbackBanDays,},)
	},)
})
