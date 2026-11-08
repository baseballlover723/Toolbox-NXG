/** Tests for how the native mod log popup is keyed. */

import {describe, expect, it, vi,} from 'vitest'

const mountPopup = vi.hoisted(() => vi.fn(() => () => {}))

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getURL: (path: string,) => `chrome-extension://fake/${path}`,},},
}),)
vi.mock('../../../util/ui/reactMount', () => ({
	mountPopup,
	classes: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean,).join(' ',),
}),)
vi.mock('../../../store', () => ({default: {dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn(),},}),)

import {showNativeModLogPopup,} from './NativeModLogPopup'

/** Opens the popup for /u/alice from the given item and returns the key it was mounted under. */
function keyFor (contextID?: string,): unknown {
	mountPopup.mockClear()
	showNativeModLogPopup({
		subreddit: 'testsub',
		user: 'alice',
		contextID,
		targetIsMod: false,
		initialPosition: {top: 0, left: 0,},
	},)
	return (mountPopup.mock.calls[0] as unknown[] | undefined)?.[2]
}

describe('showNativeModLogPopup', () => {
	it('gives each post or comment its own popup so new notes attach to the right item', () => {
		expect(keyFor('t1_first',),).not.toBe(keyFor('t1_second',),)
	})

	it('reuses the popup when reopened from the same item', () => {
		expect(keyFor('t1_first',),).toBe(keyFor('t1_first',),)
	})
})
