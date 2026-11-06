/** Tests for routing Firefox container requests to their originating frame. */

import {describe, expect, it, vi,} from 'vitest'

vi.mock('webextension-polyfill', () => ({default: {tabs: {sendMessage: vi.fn(),},},}),)

import {containerTargetFor,} from './containerRequest'

describe('containerTargetFor', () => {
	it('targets the sending frame of a container tab', () => {
		expect(containerTargetFor({tab: {id: 4, cookieStoreId: 'firefox-container-2',}, frameId: 9,} as never,),)
			.toEqual({tabId: 4, frameId: 9, cookieStoreId: 'firefox-container-2',},)
	})

	it('defaults to the top frame when the sender has no frame id', () => {
		expect(containerTargetFor({tab: {id: 4, cookieStoreId: 'firefox-container-2',},} as never,),)
			.toEqual({tabId: 4, frameId: 0, cookieStoreId: 'firefox-container-2',},)
	})

	it('leaves default-container, tab-less, and store-less senders to the background', () => {
		expect(containerTargetFor({tab: {id: 4, cookieStoreId: 'firefox-default',}, frameId: 0,} as never,),)
			.toBeUndefined()
		expect(containerTargetFor({} as never,),).toBeUndefined()
		expect(containerTargetFor({tab: {id: 4,}, frameId: 0,} as never,),).toBeUndefined()
		expect(containerTargetFor({tab: {cookieStoreId: 'firefox-container-2',},} as never,),).toBeUndefined()
	})

	it('never forwards in the Chrome bundle', async () => {
		vi.resetModules()
		vi.doMock('../../util/infra/buildenv', () => ({isFirefoxBuild: false,}),)
		const chrome = await import('./containerRequest')

		expect(chrome.containerTargetFor({tab: {id: 4, cookieStoreId: 'firefox-container-2',}, frameId: 0,} as never,),)
			.toBeUndefined()
		vi.doUnmock('../../util/infra/buildenv',)
	})
})
