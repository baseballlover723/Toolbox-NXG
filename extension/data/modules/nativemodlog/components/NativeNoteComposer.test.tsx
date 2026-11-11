/** Tests for NativeNoteComposer. */

import {act,} from 'react'
import {createRoot, type Root,} from 'react-dom/client'
import {afterEach, describe, expect, it, vi,} from 'vitest'

const createModNote = vi.hoisted(() => vi.fn())
const proposeOrBan = vi.hoisted(() => vi.fn())
// Personal setting `banWithBanLabel`; undefined falls through to the hook's default.
const banWithBanLabel = vi.hoisted(() => ({value: undefined as boolean | undefined,}))
const banNoteDuration = vi.hoisted(() => ({value: undefined as string | null | undefined,}))

vi.mock('../../../api/resources/modnotes', () => ({createModNote,}),)
vi.mock('../../shared/proposals/gateway', () => ({proposeOrBan,}),)
vi.mock('../../../util/ui/reactMount', () => ({
	classes: (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean,).join(' ',),
}),)
vi.mock('../../../util/ui/hooks', () => ({
	useSetting: (_module: string, key: string, fallback: unknown,) => {
		if (key === 'banWithBanLabel' && banWithBanLabel.value !== undefined) {
			return banWithBanLabel.value
		}
		if (key === 'banNoteDuration' && banNoteDuration.value !== undefined) {
			return banNoteDuration.value
		}
		return fallback
	},
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
	banWithBanLabel.value = undefined
	banNoteDuration.value = undefined
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
			{permanent: false, days: 7, note: 'repeat offender', message: '', context: 't1_abc',},
		)
	})

	it('bans without a linked item when the note has no context', async () => {
		createModNote.mockResolvedValue(undefined,)
		proposeOrBan.mockResolvedValue(undefined,)
		const {host,} = renderComposer({defaultLabel: 'BAN', contextID: undefined,},)

		setNoteText(host, 'repeat offender',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(proposeOrBan,).toHaveBeenCalledWith(
			{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
			{permanent: false, days: 7, note: 'repeat offender', message: '',},
		)
	})

	it('fills the ban message and days from a ban macro', async () => {
		createModNote.mockResolvedValue(undefined,)
		proposeOrBan.mockResolvedValue(undefined,)
		const {host,} = renderComposer({
			defaultLabel: 'BAN',
			banTokenInfo: {author: 'alice', subreddit: 'testsub', mod: 'testmod',},
			savedBanMacros: [{
				title: 'Spam',
				note: 'n',
				message: 'Bye {author} from {mod}',
				permanent: false,
				days: 30,
			},],
		},)

		const select = host.querySelector<HTMLSelectElement>('select[aria-label="Apply ban macro"]',)!
		act(() => {
			select.value = '0'
			select.dispatchEvent(new Event('change', {bubbles: true,},),)
		},)
		setNoteText(host, 'spammer',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(proposeOrBan,).toHaveBeenCalledWith(
			expect.anything(),
			{permanent: false, days: 30, note: 'spammer', message: 'Bye alice from testmod', context: 't1_abc',},
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

	it('starts the ban from the subreddit defaults', async () => {
		createModNote.mockResolvedValue(undefined,)
		proposeOrBan.mockResolvedValue(undefined,)
		const {host,} = renderComposer({
			defaultLabel: 'BAN',
			banDefaults: {note: '', message: 'You are banned from r/testsub', permanent: false, days: 3,},
		},)

		setNoteText(host, 'repeat offender',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(proposeOrBan,).toHaveBeenCalledWith(
			expect.anything(),
			{
				permanent: false,
				days: 3,
				note: 'repeat offender',
				message: 'You are banned from r/testsub',
				context: 't1_abc',
			},
		)
	})

	it('leaves the ban off for a Ban label when the setting is off', async () => {
		banWithBanLabel.value = false
		createModNote.mockResolvedValue(undefined,)
		const {host,} = renderComposer({defaultLabel: 'BAN',},)

		expect(host.querySelector<HTMLInputElement>('input[type="checkbox"]',)!.checked,).toBe(false,)
		setNoteText(host, 'already banned elsewhere',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).toHaveBeenCalled()
		expect(proposeOrBan,).not.toHaveBeenCalled()
	})

	it('offers no ban for Ban or Permaban when the subreddit turns native note bans off', async () => {
		createModNote.mockResolvedValue(undefined,)
		const {host,} = renderComposer({defaultLabel: 'PERMA_BAN', banDisabled: true,},)

		expect(host.textContent,).not.toContain('Issue Permanent Ban',)
		expect(host.querySelector('input[type="checkbox"]',),).toBeNull()
		setNoteText(host, 'note only',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).toHaveBeenCalled()
		expect(proposeOrBan,).not.toHaveBeenCalled()
	})

	it('refuses an empty ban message when the subreddit requires one', async () => {
		const {host,} = renderComposer({defaultLabel: 'PERMA_BAN', requireBanMessage: true,},)

		setNoteText(host, 'permaban',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).not.toHaveBeenCalled()
		expect(host.textContent,).toContain('/r/testsub requires a ban message',)
	})

	it('does not require a ban message for a note without a ban', async () => {
		createModNote.mockResolvedValue(undefined,)
		const {host,} = renderComposer({requireBanMessage: true,},)

		setNoteText(host, 'just a note',)
		await click(findButton(host, 'Save for /r/testsub',),)

		expect(createModNote,).toHaveBeenCalled()
	})

	it('warns about tokens it cannot fill instead of dropping them', () => {
		const {host,} = renderComposer({
			defaultLabel: 'BAN',
			banDefaults: {note: '', message: 'Banned for {url}', permanent: false,},
		},)

		expect(host.querySelector<HTMLTextAreaElement>('textarea',)!.value,).toBe('Banned for {url}',)
		expect(host.textContent,).toContain('{url} can',)
	})

	describe('banNoteDuration', () => {
		it('sets ban days from a matching note duration regex', async () => {
			banNoteDuration.value = String.raw`^\s*(\d+)d\s+`
			createModNote.mockResolvedValue(undefined,)
			proposeOrBan.mockResolvedValue(undefined,)
			const {host,} = renderComposer({defaultLabel: 'BAN',},)

			setNoteText(host, '5d Toxicity',)

			expect(host.querySelector('sup',),).toBeNull()
			await click(findButton(host, 'Save for /r/testsub',),)

			expect(proposeOrBan,).toHaveBeenCalledWith(
				{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
				{permanent: false, days: 5, note: '5d Toxicity', message: '',},
			)
		})

		it('resets ban days to the subreddit default when the note no longer matches', async () => {
			banNoteDuration.value = String.raw`^\s*(\d+)d\s+`
			createModNote.mockResolvedValue(undefined,)
			proposeOrBan.mockResolvedValue(undefined,)
			const {host,} = renderComposer({
				defaultLabel: 'BAN',
				banDefaults: {note: '', message: '', permanent: false, days: 3,},
			},)

			setNoteText(host, '5d Toxicity',)
			setNoteText(host, 'No duration specified',)

			expect(host.querySelector('sup',),).toBeNull()
			await click(findButton(host, 'Save for /r/testsub',),)

			expect(proposeOrBan,).toHaveBeenCalledWith(
				{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
				{permanent: false, days: 3, note: 'No duration specified', message: '',},
			)
		})

		it('uses the default ban duration when no regex is configured', async () => {
			createModNote.mockResolvedValue(undefined,)
			proposeOrBan.mockResolvedValue(undefined,)
			const {host,} = renderComposer({
				defaultLabel: 'BAN',
				banDefaults: {note: '', message: '', permanent: false, days: 3,},
			},)

			setNoteText(host, '5d Toxicity',)

			expect(host.querySelector('sup',),).toBeNull()
			await click(findButton(host, 'Save for /r/testsub',),)

			expect(proposeOrBan,).toHaveBeenCalledWith(
				{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
				{permanent: false, days: 3, note: '5d Toxicity', message: '',},
			)
		})

		it.each([
			{note: '0d zero duration', days: '0',},
			{note: '1000d excessive duration', days: '1000',},
		],)('flags invalid ban duration for $note"', async ({note, days,},) => {
			banNoteDuration.value = String.raw`^\s*(\d+)d\s+`
			const {host,} = renderComposer({defaultLabel: 'BAN',},)

			setNoteText(host, note,)

			expect(host.querySelector<HTMLInputElement>('input[type="number"]',)!.value,).toBe(days,)
			expect(host.querySelector('sup',)?.textContent,).toBe('* Invalid ban duration',)
			expect(findButton(host, 'Save for /r/testsub',).disabled,).toBe(true,)

			await click(findButton(host, 'Save for /r/testsub',),)

			expect(createModNote,).not.toHaveBeenCalled()
			expect(proposeOrBan,).not.toHaveBeenCalled()
		},)

		it('clears invalid ban duration when the note is corrected', async () => {
			banNoteDuration.value = String.raw`^\s*(\d+)d\s+`
			createModNote.mockResolvedValue(undefined,)
			proposeOrBan.mockResolvedValue(undefined,)
			const {host,} = renderComposer({defaultLabel: 'BAN',},)

			setNoteText(host, '1000d excessive duration',)
			expect(host.querySelector<HTMLInputElement>('input[type="number"]',)!.value,).toBe('1000',)
			expect(host.querySelector('sup',)?.textContent,).toBe('* Invalid ban duration',)
			expect(findButton(host, 'Save for /r/testsub',).disabled,).toBe(true,)

			setNoteText(host, '5d Toxicity',)

			expect(host.querySelector('sup',),).toBeNull()
			await click(findButton(host, 'Save for /r/testsub',),)

			expect(proposeOrBan,).toHaveBeenCalledWith(
				{subreddit: 'testsub', itemId: 'alice', itemKind: 'user', link: 'https://www.reddit.com/user/alice',},
				{permanent: false, days: 5, note: '5d Toxicity', message: '',},
			)
		})

		describe(String.raw`^\s*(\d+)d\s+ Regex tests`, () => {
			it.each([
				'reason 7d',
				'7d',
				'7dreason',
				'7d-reason',
				'7d_reason',
				'-7d reason',
				'+7d reason',
				'1.5d reason',
				'7 d reason',
				'seven d reason',
				'd reason',
				'７d reason',
				'7dd reason',
			],)(`%s doesn't match regex`, async (note,) => {
				banNoteDuration.value = String.raw`^\s*(\d+)d\s+`
				const {host,} = renderComposer({
					defaultLabel: 'BAN',
					banDefaults: {note: '', message: '', permanent: false, days: 3,},
				},)

				setNoteText(host, note,)

				expect(host.querySelector('sup',),).toBeNull()
				await click(findButton(host, 'Save for /r/testsub',),)

				expect(proposeOrBan,).toHaveBeenCalledWith(
					{
						subreddit: 'testsub',
						itemId: 'alice',
						itemKind: 'user',
						link: 'https://www.reddit.com/user/alice',
					},
					{permanent: false, days: 3, note, message: '',},
				)
			},)
		},)
	})
})
