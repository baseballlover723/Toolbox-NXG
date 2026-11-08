/** Tests for the NN tag's note truncation. */

import {act,} from 'react'
import {createRoot, type Root,} from 'react-dom/client'
import {afterEach, describe, expect, it, vi,} from 'vitest'

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getURL: (path: string,) => `chrome-extension://fake/${path}`,},},
}),)

import type {ModNote,} from '../../shared/modnotes/schema'
import {NativeModLogBadge,} from './NativeModLogBadge'
;(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true

const roots: Root[] = []

afterEach(() => {
	act(() => roots.splice(0,).forEach((root,) => root.unmount()))
	document.body.innerHTML = ''
},)

/** Builds a native note entry with the given text. */
function noteWith (text: string,): ModNote {
	return {
		id: 'n1',
		created_at: 0,
		type: 'NOTE',
		operator: 'mod',
		subreddit: 'sub',
		user: 'someone',
		label: null,
		description: null,
		details: null,
		user_note_data: {note: text, label: null, reddit_id: null,},
		mod_action_data: null,
	}
}

/** Renders the badge and returns its button. */
function renderBadge (note: ModNote, maxChars: number,): HTMLButtonElement {
	const host = document.createElement('div',)
	document.body.appendChild(host,)
	const root = createRoot(host,)
	roots.push(root,)
	act(() =>
		root.render(
			<NativeModLogBadge user="someone" subreddit="sub" note={note} maxChars={maxChars} onClick={() => {}} />,
		)
	)
	return host.querySelector('button',)!
}

describe('NativeModLogBadge', () => {
	it('truncates note text to maxChars and keeps the full text in the tooltip', () => {
		const button = renderBadge(noteWith('Warned about spam links in the weekly thread',), 10,)

		expect(button.textContent,).toBe('Warned abo...',)
		expect(button.title,).toContain('Warned about spam links in the weekly thread',)
	})

	it('leaves notes within the limit untouched', () => {
		const button = renderBadge(noteWith('Short note',), 50,)

		expect(button.textContent,).toBe('Short note',)
	})
})
