/** Tests for expand-all / collapse-all that loads each expando only once. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const getSubmissionBodiesHtml = vi.hoisted(() => vi.fn())
vi.mock('../../../api/resources/things', () => ({getSubmissionBodiesHtml,}),)
// DOMPurify doesn't sanitize reliably under happy-dom, so stand in for it and check the body goes through it.
const purifyHTML = vi.hoisted(() => vi.fn((html: string,) => html))
vi.mock('../../../util/data/purify', () => ({purifyHTML,}),)
vi.mock('../../../util/infra/logging', () => ({default: () => ({warn: vi.fn(), error: vi.fn(), debug: vi.fn(),}),}),)

import {createExpandoControls, filledClass, softCollapsedClass,} from './expandos'

/** One queue item: a text post (`self`) or a link post, with its expando open or closed. */
type Item = {kind: 'self' | 'link'; state: 'expanded' | 'collapsed'}

/** Builds a queue from the given items; item i has fullname `t3_i`. */
function setQueue (...items: Item[]) {
	document.body.innerHTML = items.map(({kind, state,}, i,) => `
		<div class="thing link${kind === 'self' ? ' self' : ''}" data-fullname="t3_${i}">
			<input type="checkbox">
			<div class="entry">
				<div class="expando-button ${state}"></div>
				<div class="expando expando-uninitialized" style="display: none">content ${i}</div>
			</div>
		</div>
	`).join('',)
}

const link = (state: Item['state'] = 'collapsed',): Item => ({kind: 'link', state,})
const self = (state: Item['state'] = 'collapsed',): Item => ({kind: 'self', state,})
const thing = (i: number,) => document.querySelector(`[data-fullname="t3_${i}"]`,)!
const button = (i: number,) => thing(i,).querySelector<HTMLElement>('.expando-button',)!
const expando = (i: number,) => thing(i,).querySelector<HTMLElement>('.expando',)!

/** Text post `t3_i`'s body, as the fetch returns it. */
const info = (i: number, body = `<div class="md"><p>body ${i}</p></div>`,): [string, string,] => [`t3_${i}`, body,]

/** The fetch's result for the given posts. */
const bodies = (...entries: Array<[string, string,]>) => new Map(entries,)

/** Lets the text-post fetch resolve and its follow-up run. */
async function flush () {
	await vi.advanceTimersByTimeAsync(0,)
}

describe('createExpandoControls', () => {
	let controls: ReturnType<typeof createExpandoControls>
	// Stands in for Reddit's own expando handler on the button.
	const redditClick = vi.fn()

	beforeEach(() => {
		vi.useFakeTimers()
		getSubmissionBodiesHtml.mockReset()
		getSubmissionBodiesHtml.mockResolvedValue(bodies(),)
		controls = createExpandoControls()
		document.addEventListener('click', redditClick,)
	},)

	afterEach(async () => {
		document.removeEventListener('click', redditClick,)
		await controls.cleanup()
		vi.useRealTimers()
		redditClick.mockReset()
	},)

	describe('collapse all', () => {
		it('hides open expandos without clicking Reddit\'s button or discarding the content', () => {
			setQueue(link('expanded',), link('expanded',),)

			controls.closeAll()

			expect(redditClick,).not.toHaveBeenCalled()
			expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(true,)
			expect(button(0,).classList.contains('collapsed',),).toBe(true,)
			expect(expando(0,).textContent,).toBe('content 0',)
		})

		it('lets expand all show them again at once, with no clicks', () => {
			setQueue(link('expanded',),)
			controls.closeAll()

			controls.openAll()

			expect(redditClick,).not.toHaveBeenCalled()
			expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(false,)
			expect(button(0,).classList.contains('expanded',),).toBe(true,)
		})

		it('stops an expand all that is still opening link posts', async () => {
			setQueue(link(), link(), link(),)

			controls.openAll()
			await flush()
			controls.closeAll()
			await vi.advanceTimersByTimeAsync(5000,)

			expect(redditClick,).toHaveBeenCalledTimes(1,)
		})
	})

	describe('link posts', () => {
		it('opens them with Reddit\'s button, a second apart, and re-clears the checkbox', async () => {
			setQueue(link(), link(),)

			controls.openAll()
			await flush()
			expect(redditClick,).toHaveBeenCalledTimes(1,)
			await vi.advanceTimersByTimeAsync(999,)
			expect(redditClick,).toHaveBeenCalledTimes(1,)
			await vi.advanceTimersByTimeAsync(1,)
			expect(redditClick,).toHaveBeenCalledTimes(2,)
			expect(thing(0,).querySelector<HTMLInputElement>('input',)!.checked,).toBe(false,)
		})

		it('lets Reddit handle clicks on expandos Toolbox did not hide', () => {
			setQueue(link('expanded',),)

			button(0,).dispatchEvent(new MouseEvent('click', {bubbles: true,},),)

			expect(redditClick,).toHaveBeenCalledOnce()
		})
	})

	describe('text posts', () => {
		it('fills them from one info request, without clicking Reddit\'s button', async () => {
			setQueue(self(), link(), self(),)
			getSubmissionBodiesHtml.mockResolvedValue(bodies(info(0,), info(2,),),)

			controls.openAll()
			await flush()

			expect(getSubmissionBodiesHtml,).toHaveBeenCalledOnce()
			expect(getSubmissionBodiesHtml,).toHaveBeenCalledWith(['t3_0', 't3_2',],)
			// The same wrapper Reddit builds: old Reddit styles self-post text through form.usertext.
			const form = expando(0,).querySelector(':scope > form.usertext.warn-on-unload',)
			expect(form?.querySelector<HTMLInputElement>('input[type="hidden"][name="thing_id"]',)?.value,).toBe(
				't3_0',
			)
			expect(form?.querySelector('.usertext-body.may-blank-within.md-container > .md > p',)?.textContent,)
				.toBe('body 0',)
			expect(expando(0,).style.display,).toBe('block',)
			expect(expando(0,).classList.contains('expando-uninitialized',),).toBe(false,)
			expect(button(0,).classList.contains('expanded',),).toBe(true,)
			expect(thing(0,).classList.contains(filledClass,),).toBe(true,)
			// Only the link post went through Reddit's button.
			expect(redditClick,).toHaveBeenCalledOnce()
			expect(redditClick.mock.calls[0]![0].target,).toBe(button(1,),)
		})

		it('requests at most 100 posts at a time', async () => {
			setQueue(...Array.from({length: 150,}, () => self(),),)

			controls.openAll()
			await flush()

			expect(getSubmissionBodiesHtml,).toHaveBeenCalledTimes(2,)
			expect(getSubmissionBodiesHtml.mock.calls[0]![0],).toHaveLength(100,)
			expect(getSubmissionBodiesHtml.mock.calls[1]![0],).toHaveLength(50,)
		})

		it('sanitizes the body before inserting it', async () => {
			setQueue(self(),)
			getSubmissionBodiesHtml.mockResolvedValue(bodies(info(0, '<div class="md"><p>hi</p></div>',),),)
			purifyHTML.mockImplementationOnce(() => '<p>clean</p>')

			controls.openAll()
			await flush()

			expect(purifyHTML,).toHaveBeenCalledWith('<div class="md"><p>hi</p></div>',)
			expect(expando(0,).querySelector('.usertext-body',)!.innerHTML,).toBe('<p>clean</p>',)
		})

		it('falls back to Reddit\'s button when a post has no body or the request fails', async () => {
			setQueue(self(), self(),)
			getSubmissionBodiesHtml.mockResolvedValue(bodies(),)

			controls.openAll()
			await flush()
			await vi.advanceTimersByTimeAsync(1000,)

			expect(redditClick,).toHaveBeenCalledTimes(2,)
			expect(thing(0,).classList.contains(filledClass,),).toBe(false,)

			redditClick.mockReset()
			setQueue(self(),)
			getSubmissionBodiesHtml.mockRejectedValue(new Error('offline',),)
			controls.openAll()
			await flush()

			expect(redditClick,).toHaveBeenCalledOnce()
		})

		it('opens nothing if collapse all is clicked before the bodies arrive', async () => {
			setQueue(self(),)
			let resolve: (value: unknown,) => void = () => {}
			getSubmissionBodiesHtml.mockReturnValue(
				new Promise((r,) => {
					resolve = r
				},),
			)

			controls.openAll()
			controls.closeAll()
			resolve(bodies(info(0,),),)
			await flush()

			expect(thing(0,).classList.contains(filledClass,),).toBe(false,)
			expect(redditClick,).not.toHaveBeenCalled()
		})

		it('toggles a filled post from its own button without Reddit seeing the click', async () => {
			setQueue(self(),)
			getSubmissionBodiesHtml.mockResolvedValue(bodies(info(0,),),)
			controls.openAll()
			await flush()

			button(0,).dispatchEvent(new MouseEvent('click', {bubbles: true,},),)
			expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(true,)
			expect(button(0,).classList.contains('collapsed',),).toBe(true,)

			button(0,).dispatchEvent(new MouseEvent('click', {bubbles: true,},),)
			expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(false,)
			expect(redditClick,).not.toHaveBeenCalled()
		})

		it('doesn\'t fetch again for a post it already filled', async () => {
			setQueue(self(),)
			getSubmissionBodiesHtml.mockResolvedValue(bodies(info(0,),),)
			controls.openAll()
			await flush()

			controls.closeAll()
			controls.openAll()
			await flush()

			expect(getSubmissionBodiesHtml,).toHaveBeenCalledOnce()
		})
	})

	it('shows a hidden expando when its own button is clicked, without Reddit seeing the click', () => {
		setQueue(link('expanded',),)
		controls.closeAll()

		button(0,).dispatchEvent(new MouseEvent('click', {bubbles: true,},),)

		expect(redditClick,).not.toHaveBeenCalled()
		expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(false,)
		expect(button(0,).classList.contains('expanded',),).toBe(true,)
	})

	it('shows hidden expandos again on cleanup', async () => {
		setQueue(link('expanded',),)
		controls.closeAll()

		await controls.cleanup()

		expect(thing(0,).classList.contains(softCollapsedClass,),).toBe(false,)
	})
})
