/** Tests for following Reddit's theme on shreddit pages. */

import {afterEach, describe, expect, it, vi,} from 'vitest'

import {darkClass, isPageDark, syncDarkClass,} from './colorScheme'

/** An element with the given classes. */
function rootWith (...classes: string[]): Element {
	const element = document.createElement('html',)
	element.classList.add(...classes,)
	return element
}

describe('isPageDark', () => {
	it('follows Reddit\'s light theme on a dark OS', () => {
		expect(isPageDark(rootWith('theme-beta', 'theme-light',), true,),).toBe(false,)
	})

	it('follows Reddit\'s dark theme on a light OS', () => {
		expect(isPageDark(rootWith('theme-beta', 'theme-dark',), false,),).toBe(true,)
	})

	it('falls back to the OS when Reddit marks no theme', () => {
		expect(isPageDark(rootWith(), true,),).toBe(true,)
		expect(isPageDark(rootWith(), false,),).toBe(false,)
	})
})

describe('syncDarkClass', () => {
	let stop: (() => unknown) | undefined

	afterEach(() => {
		stop?.()
		document.documentElement.className = ''
	},)

	it('tracks an in-place theme switch', async () => {
		vi.stubGlobal('matchMedia', () => ({matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),}),)
		document.documentElement.className = 'theme-light'
		stop = syncDarkClass()
		expect(document.documentElement.classList.contains(darkClass,),).toBe(false,)

		document.documentElement.classList.replace('theme-light', 'theme-dark',)
		await Promise.resolve()

		expect(document.documentElement.classList.contains(darkClass,),).toBe(true,)
		vi.unstubAllGlobals()
	})
})
