/** Tests for NativeNoteComposer. */

import {act,} from 'react'
import {createRoot, type Root,} from 'react-dom/client'
import {afterEach, describe, expect, it, vi,} from 'vitest'

const createModNote = vi.hoisted(() => vi.fn())
const proposeOrBan = vi.hoisted(() => vi.fn())

vi.mock('../../../api/resources/modnotes', () => ({createModNote,}),)
vi.mock('../../shared/proposals/gateway', () => ({proposeOrBan,}),)
vi.mock('../../../util/ui/reactMount', () => ({
	classes: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean,).join(' ',),
}),)
vi.mock('../../../store', () => ({default: {dispatch: vi.fn(), getState: vi.fn(), subscribe: vi.fn(),},}),)
vi.mock('../../../store/feedback', () => ({positiveTextFeedback: vi.fn(),}),)
vi.mock('../../../util/infra/logging', () => ({default: () => ({error: vi.fn(),}),}),)
;(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true

import {NativeNoteComposer,} from './NativeNoteComposer'

const roots: Root[] = []

function renderComposer (props: Partial<React.ComponentProps<typeof NativeNoteComposer>> = {},) {
	const host = document.createElement('div',)
	document.body.appendChild(host,)
	const root = createRoot(host,)
	roots.push(root,)
	const onSaved = vi.fn()
	act(() => {
		root.render(
			<NativeNoteComposer subreddit="testsub" user="alice" contextID="t1_abc" onSaved={onSaved} {...props} />,
		)
	},)
	return {host, onSaved,}
}

function setNoteText (host: HTMLElement, value: string,) {
	const input = host.querySelector<HTMLInputElement>('input[placeholder="Add a note..."]',)!
	act(() => {
		const valueSetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input,), 'value',)?.set
		valueSetter?.call(input, value,)
		input.dispatchEvent(new InputEvent('input', {bubbles: true, data: value,},),)
	},)
}

function findButton (host: HTMLElement, text: string,) {
	const button = Array.from(host.querySelectorAll('button',),).find((button,) => button.textContent === text)
	expect(button,).toBeDefined()
	return button!
}

async function click (element: HTMLElement,) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent('click', {bubbles: true,},),)
		await Promise.resolve()
	},)
}

afterEach(() => {
	for (const root of roots.splice(0,)) {
		act(() => root.unmount())
	}
	document.body.innerHTML = ''
	vi.clearAllMocks()
},)

describe('NativeNoteComposer', () => {
	it('does not offer AI-generated user summary as a label', () => {
		const {host,} = renderComposer()

		const labels = Array.from(host.querySelectorAll('button[aria-pressed]',),).map((button,) => button.textContent)
		expect(labels,).toContain('Helpful User',)
		expect(labels,).not.toContain('AI-generated user summary',)
	})

	it('requires note text before saving', async () => {
		const {host, onSaved,} = renderComposer()

		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).not.toHaveBeenCalled()
		expect(onSaved,).not.toHaveBeenCalled()
		expect(host.textContent,).toContain('Note text is required',)
	})

	it('saves the note with its label and context', async () => {
		createModNote.mockResolvedValue(undefined,)
		const {host, onSaved,} = renderComposer()

		await click(findButton(host, 'Spam Watch',),)
		setNoteText(host, '  watch this  ',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).toHaveBeenCalledWith({
			user: 'alice',
			subreddit: 'testsub',
			redditID: 't1_abc',
			note: 'watch this',
			label: 'SPAM_WATCH',
		},)
		expect(proposeOrBan,).not.toHaveBeenCalled()
		expect(onSaved,).toHaveBeenCalledTimes(1,)
	})

	it('preselects the default label', () => {
		const {host,} = renderComposer({defaultLabel: 'BAN',},)

		expect(findButton(host, 'Ban',).getAttribute('aria-pressed',),).toBe('true',)
	})

	it('bans the user alongside a Ban note', async () => {
		createModNote.mockResolvedValue(undefined,)
		proposeOrBan.mockResolvedValue(undefined,)
		const {host,} = renderComposer({defaultLabel: 'BAN',},)

		setNoteText(host, 'repeat offender',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(proposeOrBan,).toHaveBeenCalledWith(
			{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
			{permanent: false, days: 7, note: 'repeat offender', message: '',},
		)
	})

	it('never bans a moderator', async () => {
		createModNote.mockResolvedValue(undefined,)
		const {host,} = renderComposer({defaultLabel: 'PERMA_BAN', targetIsMod: true,},)

		expect(host.textContent,).toContain('(user is a mod)',)
		setNoteText(host, 'mod note',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).toHaveBeenCalled()
		expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]',)!.checked,).toBe(false,)
		expect(proposeOrBan,).not.toHaveBeenCalled()
	})
})
