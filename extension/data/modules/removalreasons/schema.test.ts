/** Tests for the removal reasons display-mode and ban-default helpers. */
import {describe, expect, it,} from 'vitest'

import {defaultRemovalBan, fallbackBanDays, isDrawerDisplayMode, resolveDisplayMode,} from './schema'

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
	it('uses the Ban Macros temporary duration', () => {
		expect(defaultRemovalBan({banMacros: {defaultBanPermanent: false, defaultBanDuration: 3,},},),)
			.toEqual({permanent: false, days: 3,},)
	})

	it('starts permanent when Ban Macros default to permanent', () => {
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
