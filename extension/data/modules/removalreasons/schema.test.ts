/** Tests for the removal reasons display-mode and ban-default helpers. */
import {describe, expect, it,} from 'vitest'

import {defaultRemovalBanDays, fallbackBanDays, isDrawerDisplayMode, resolveDisplayMode,} from './schema'

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

describe('defaultRemovalBanDays', () => {
	it('uses the Ban Macros temporary duration', () => {
		expect(defaultRemovalBanDays({banMacros: {defaultBanPermanent: false, defaultBanDuration: 3,},},),).toBe(3,)
	})

	it.each([
		['no config', undefined,],
		['no ban macros', {banMacros: null,},],
		['a permanent default', {banMacros: {defaultBanPermanent: true, defaultBanDuration: 0,},},],
		['an unset duration', {banMacros: {defaultBanPermanent: false, defaultBanDuration: 0,},},],
		['an out-of-range duration', {banMacros: {defaultBanPermanent: false, defaultBanDuration: 1000,},},],
		['a fractional duration', {banMacros: {defaultBanPermanent: false, defaultBanDuration: 2.5,},},],
	],)('falls back to 7 days with %s', (_label, config,) => {
		expect(defaultRemovalBanDays(config,),).toBe(fallbackBanDays,)
	},)
})
