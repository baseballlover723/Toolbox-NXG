/** Tests for revealing and re-hiding seen comments on old Reddit. */

import {beforeEach, describe, expect, it, vi,} from 'vitest'

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getURL: (path: string,) => `chrome-extension://fake/${path}`,},},
}),)
vi.mock('../../../dom/uiLocations', () => ({renderAtLocation: () => () => {}, provideLocation: () => () => {},}),)
vi.mock('../../../util/infra/logging', () => ({default: () => ({debug: vi.fn(),}),}),)

import {createOldRedditCommentAdapter,} from '../platformInterface'
import {createHideOldCommentsHandlers,} from './hideOldComments'

/** A seen top-level comment with one new reply, mirroring old Reddit's nesting. */
function renderThread () {
	document.body.innerHTML = `
		<div class="thing comment" id="parent">
			<div class="entry"><p class="tagline">parent tagline</p><div class="md">parent text</div></div>
			<div class="child">
				<div class="thing comment new-comment" id="reply">
					<div class="entry"><p class="tagline">reply tagline</p><div class="md">reply text</div></div>
				</div>
			</div>
		</div>`
	const parent = document.getElementById('parent',)!
	const reply = document.getElementById('reply',)!
	return {parent, reply, parentEntry: parent.querySelector<HTMLElement>(':scope > .entry',)!,}
}

/** Fakes the delegated click lifecycle.delegate would deliver: the matched element plus the event. */
function clickEvent (target: Element,): Event {
	const event = new MouseEvent('click', {bubbles: true,},)
	Object.defineProperty(event, 'target', {value: target,},)
	return event
}

describe('hide seen comments', () => {
	let handlers: ReturnType<typeof createHideOldCommentsHandlers>
	const adapter = createOldRedditCommentAdapter()

	beforeEach(() => {
		handlers = createHideOldCommentsHandlers(adapter,)
	},)

	/** Hides the parent the way the "hide seen" button does. */
	function hideParent (parent: Element,) {
		adapter.markThingOldCollapsed(parent, true,)
		adapter.setElementVisible(adapter.getCommentEntry(parent,)!, false,)
	}

	it('does not reveal a hidden parent when one of its replies is clicked', () => {
		const {parent, reply, parentEntry,} = renderThread()
		hideParent(parent,)

		handlers.handleOldExpandClick(parent, clickEvent(reply.querySelector('.md',)!,),)

		expect(parent.classList.contains('old-expand',),).toBe(true,)
		expect(parentEntry.style.display,).toBe('none',)
	})

	it('reveals a hidden comment clicked on its own area and offers a hide link', () => {
		const {parent, parentEntry,} = renderThread()
		hideParent(parent,)

		handlers.handleOldExpandClick(parent, clickEvent(parent,),)

		expect(parent.classList.contains('old-expand',),).toBe(false,)
		expect(parentEntry.style.display,).toBe('',)
		expect(parentEntry.querySelectorAll('.toolbox-rehide-old',).length,).toBe(1,)
	})

	it('re-hides a revealed comment from its hide link, leaving replies visible', () => {
		const {parent, reply, parentEntry,} = renderThread()
		hideParent(parent,)
		handlers.handleOldExpandClick(parent, clickEvent(parent,),)

		const link = parentEntry.querySelector('.toolbox-rehide-old',)!
		handlers.handleRehideOldClick(link,)
		// The same click also reaches the old-expand delegate once the class is back; it must not undo the hide.
		handlers.handleOldExpandClick(parent, clickEvent(link,),)

		expect(parent.classList.contains('old-expand',),).toBe(true,)
		expect(parentEntry.style.display,).toBe('none',)
		expect(reply.querySelector<HTMLElement>('.entry',)!.style.display,).toBe('',)
	})

	it('adds only one hide link across repeated reveals', () => {
		const {parent, parentEntry,} = renderThread()
		for (let i = 0; i < 2; i++) {
			hideParent(parent,)
			handlers.handleOldExpandClick(parent, clickEvent(parent,),)
		}

		expect(parentEntry.querySelectorAll('.toolbox-rehide-old',).length,).toBe(1,)
	})
})
