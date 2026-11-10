/** Tests for where the Comment Nuke button is offered next to a comment's author. */

import type {ReactElement,} from 'react'
import {beforeEach, describe, expect, it, vi,} from 'vitest'

// uiLocations, the popup and feedback pull in the store and the webextension polyfill, which throw
// outside a browser; only the renderer's decision to show the button is under test here.
const renderAtLocation = vi.hoisted(() => vi.fn(() => () => {}))
const pageDetails = vi.hoisted(() => ({pageType: 'queueListing',}))
vi.mock('../../dom/uiLocations', () => ({renderAtLocation,}),)
vi.mock('../../util/reddit/pageContext', () => ({pageDetails,}),)
vi.mock('./components/NukeCommentsPopup', () => ({showNukeCommentsPopup: vi.fn(),}),)
vi.mock('../../store/feedback', () => ({negativeTextFeedback: vi.fn(),}),)
vi.mock('../../shared/controls/IsModGuard', () => ({IsModGuard: vi.fn(),}),)
vi.mock('../../shared/controls/AuthorButton', () => ({AuthorButton: vi.fn(),}),)
vi.mock('../../shared/controls/GeneralButton', () => ({GeneralButton: vi.fn(),}),)
vi.mock('../../util/ui/drawPosition', () => ({drawPosition: vi.fn(),}),)
vi.mock('../../util/infra/platform', () => ({RedditPlatform: {Old: 'old',},}),)
vi.mock('../../util/infra/logging', () => ({default: () => ({debug: vi.fn(),}),}),)

import type {UILocationRenderArgs,} from '../../dom/uiLocations'
import {createNukeCommentsHandlers,} from './dom'
import type {NukeCommentsSettings,} from './settings'

const settings = {ignoreDistinguished: false, showNextToUser: true, executionType: 'remove',} as NukeCommentsSettings

const context = {thingId: 't1_abc', postId: 't3_xyz', subreddit: 'testsub',}

/** Registers the handlers and returns the renderer for the slot next to the author. */
function authorRenderer () {
	renderAtLocation.mockClear()
	createNukeCommentsHandlers(settings,)
	const call = renderAtLocation.mock.calls.find((args: unknown[],) => args[0] === 'authorActions')
	return call![2] as unknown as (
		args: Pick<UILocationRenderArgs<'authorActions'>, 'target'> & {
			context: typeof context
		},
	) => ReactElement | null
}

/** An author slot, optionally inside a context popup. */
function authorSlot (inContextPopup: boolean,) {
	document.body.innerHTML = inContextPopup
		? '<div class="context-button-popup"><span class="toolbox-author-slot"></span></div>'
		: '<span class="toolbox-author-slot"></span>'
	return document.querySelector('.toolbox-author-slot',)!
}

describe('nuke button next to the author', () => {
	beforeEach(() => {
		pageDetails.pageType = 'queueListing'
	},)

	it('is offered in a context popup on a page that is not a comments page', () => {
		expect(authorRenderer()({context, target: authorSlot(true,),},),).not.toBeNull()
	})

	it('is not offered outside a context popup on such a page', () => {
		expect(authorRenderer()({context, target: authorSlot(false,),},),).toBeNull()
	})

	it('is still offered on comments pages', () => {
		pageDetails.pageType = 'subredditCommentsPage'
		expect(authorRenderer()({context, target: authorSlot(false,),},),).not.toBeNull()
	})

	it('is not offered for a post in a context popup', () => {
		expect(authorRenderer()({context: {...context, thingId: 't3_xyz',}, target: authorSlot(true,),},),)
			.toBeNull()
	})
})
