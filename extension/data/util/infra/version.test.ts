/** Tests for the page classes that identify this extension and its version to stylesheets. */
import {describe, expect, it, vi,} from 'vitest'

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getManifest: () => ({version: '8.0.0.13',}),},},
}),)

const {versionClassNames,} = await import('./version')

describe('versionClassNames', () => {
	it('adds brand, major, and major-minor classes', () => {
		expect(versionClassNames('8.1.2.5',),).toEqual(['toolbox-nxg', 'toolbox-nxg-v8', 'toolbox-nxg-v8-1',],)
	})

	it('handles two-digit parts', () => {
		expect(versionClassNames('10.12.0.0',),).toEqual(['toolbox-nxg', 'toolbox-nxg-v10', 'toolbox-nxg-v10-12',],)
	})

	it('falls back to the brand class for an unparseable version', () => {
		expect(versionClassNames('dev',),).toEqual(['toolbox-nxg',],)
	})
})
