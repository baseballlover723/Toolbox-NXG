/** Tests for the removal reasons display-mode helpers. */
import {describe, expect, it,} from 'vitest'

import {isDrawerDisplayMode, resolveDisplayMode,} from './schema'

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
