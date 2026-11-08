/** Tests for BanMacroSelect: hidden without macros, applies the chosen one, and rests on the placeholder. */

import {act,} from 'react'
import {createRoot, type Root,} from 'react-dom/client'
import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getURL: (path: string,) => `chrome-extension://fake/${path}`,},},
}),)

import type {SavedBanMacro,} from '../schema'
import {BanMacroSelect,} from './BanMacroSelect'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
	;(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true
	container = document.createElement('div',)
	document.body.appendChild(container,)
	root = createRoot(container,)
},)

afterEach(() => {
	act(() => root.unmount())
	container.remove()
},)

const macros: SavedBanMacro[] = [
	{id: 'a', title: 'Spam', note: 'n1', message: 'm1', permanent: true, days: 7,},
	{id: 'b', title: 'Harassment', note: 'n2', message: 'm2', permanent: false, days: 3,},
]

/** Selects the option at `value` the way a user would. */
function choose (select: HTMLSelectElement, value: string,) {
	act(() => {
		select.value = value
		select.dispatchEvent(new Event('change', {bubbles: true,},),)
	},)
}

describe('BanMacroSelect', () => {
	it('renders nothing when there are no macros', () => {
		act(() => root.render(<BanMacroSelect macros={[]} onApply={vi.fn()} />,))

		expect(container.querySelector('select',),).toBeNull()
	})

	it('lists the macros after a placeholder and applies the chosen one', () => {
		const onApply = vi.fn()
		act(() => root.render(<BanMacroSelect macros={macros} onApply={onApply} />,))

		const select = container.querySelector('select',)!
		expect([...select.options,].map((o,) => o.text),).toEqual(['Apply ban macro...', 'Spam', 'Harassment',],)

		choose(select, '1',)

		expect(onApply,).toHaveBeenCalledWith(macros[1],)
		// The control stays on the placeholder so the same macro can be applied again.
		expect(select.value,).toBe('',)
	})

	it('ignores the placeholder option', () => {
		const onApply = vi.fn()
		act(() => root.render(<BanMacroSelect macros={macros} onApply={onApply} />,))

		choose(container.querySelector('select',)!, '',)

		expect(onApply,).not.toHaveBeenCalled()
	})
})
