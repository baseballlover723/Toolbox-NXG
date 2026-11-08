/**
 * Registers a "hide seen" / "show seen" button for old-Reddit comment threads that collapses
 * or expands comments the user has already read, based on Reddit's comment-visits highlighting.
 */
import {useEffect, useState,} from 'react'

import {getCommentVisits, getCommentVisitsBox, getCommentVisitsTitle,} from '../../../dom/oldReddit/comments'
import {provideLocation, renderAtLocation,} from '../../../dom/uiLocations'
import {GeneralButton,} from '../../../shared/controls/GeneralButton'
import createLogger from '../../../util/infra/logging'
import {RedditPlatform,} from '../../../util/infra/platform'
import {useMountEffect,} from '../../../util/ui/hooks'
import {type CommentModuleAdapter,} from '../platformInterface'

const log = createLogger('Comments',)

/** The option text value in the comment-visits select that indicates no highlighting is active. */
const noHighlightingOption = 'no highlighting'

/** Props for the HideOldButton component. */
interface HideOldButtonProps {
	/** The Reddit comment-visits `<select>` element, used to detect the active highlighting option. */
	commentvisits: HTMLSelectElement | null
	/** Called on mount with a setter so the parent handler can sync the hidden state. */
	onMount: (setHidden: (hidden: boolean,) => void,) => void
}

/**
 * Renders a toggle button that hides or shows already-seen comments.
 * Shows "show all" when no highlighting is active, "hide seen" / "show seen" otherwise.
 */
function HideOldButton ({
	commentvisits,
	onMount,
}: HideOldButtonProps,) {
	const [noHighlighting, setNoHighlighting,] = useState(() => {
		const selected = commentvisits?.options[commentvisits.selectedIndex]
		return selected?.text === noHighlightingOption
	},)
	const [hidden, setHidden,] = useState(false,)

	useMountEffect(() => {
		onMount(setHidden,)
	},)

	// This listener is intentionally managed by React (useEffect + cleanup return) rather than
	// the module lifecycle: it calls setNoHighlighting and setHidden, which are React state
	// setters that only exist in this component. Moving it to the module lifecycle would require
	// threading callbacks out of the component with no benefit.
	useEffect(() => {
		if (!commentvisits) { return }
		const handler = () => {
			const selected = commentvisits.options[commentvisits.selectedIndex]
			setNoHighlighting(selected?.text === noHighlightingOption,)
			setHidden(false,)
		}
		commentvisits.addEventListener('change', handler,)
		return () => commentvisits.removeEventListener('change', handler,)
	}, [commentvisits,],)

	const text = noHighlighting ? 'show all' : hidden ? 'show seen' : 'hide seen'
	return <GeneralButton className="toolbox-hide-old">{text}</GeneralButton>
}

/**
 * Provides the `commentThreadControls` UI location on the comment-visits title element,
 * widening the comment-visits box if present.
 * Performs the DOM query and DOM manipulation; call `lifecycle.mount(cleanup)` in `index.ts`.
 * @returns A cleanup function, or null if the comment-visits title element was not found.
 */
export function createHideOldCommentsSetup (): (() => void) | null {
	const commentVisitsTitle = getCommentVisitsTitle()
	if (!commentVisitsTitle) { return null }
	const box = getCommentVisitsBox()
	if (box) { box.style.maxWidth = '650px' }
	commentVisitsTitle.append('  ',)
	return provideLocation('commentThreadControls', commentVisitsTitle, {
		platform: RedditPlatform.Old,
		kind: 'commentThread',
		rawDetail: {commentvisits: getCommentVisits(),},
		// Inline host so the buttons sit beside the title text rather than on a new line: the
		// box fills in after page load, and a block host would push every comment down.
	}, {shadow: false, hostTag: 'span',},)
}

/**
 * Creates handlers for the hide-old-comments button in the `commentThreadControls` UI location.
 * Call `lifecycle.mount(handlers.cleanup)` in `index.ts`.
 * @param adapter The platform adapter used to find, collapse, and expand old comment things.
 * @returns Handlers for the hide-old toggle, old-expand, and re-hide clicks, plus a cleanup function.
 */
export function createHideOldCommentsHandlers (adapter: CommentModuleAdapter,): {
	handleHideOldClick(): void
	handleOldExpandClick(element: Element, event: Event,): void
	handleRehideOldClick(element: Element,): void
	cleanup(): void
} {
	const commentvisits = getCommentVisits()
	let setHidden: ((hidden: boolean,) => void) | null = null

	/** Hides a seen comment's own entry; its replies stay visible. */
	function collapse (thing: Element,) {
		adapter.markThingOldCollapsed(thing, true,)
		const entry = adapter.getCommentEntry(thing,)
		if (entry) { adapter.setElementVisible(entry, false,) }
	}

	const cleanup = renderAtLocation('commentThreadControls', {id: 'comment.hideOld',}, ({context,},) => {
		const cv = (context.rawDetail as {commentvisits: HTMLSelectElement | null} | undefined)?.commentvisits ?? null
		if (!cv) { return null }
		return <HideOldButton
			commentvisits={cv}
			onMount={(setter,) => {
				setHidden = setter
			}}
		/>
	},)

	return {
		cleanup,
		handleHideOldClick () {
			const selectedOption = commentvisits?.options[commentvisits.selectedIndex]
			const isNoHighlighting = !selectedOption || selectedOption.text === noHighlightingOption

			if (isNoHighlighting) {
				adapter.resetAllCommentVisibility()
				return
			}

			const oldThings = adapter.getOldCommentThings()
			const anyHidden = oldThings.some((thing,) => thing.classList.contains('old-expand',))

			if (anyHidden) {
				log.debug('showing seen comments',)
				adapter.resetAllCommentVisibility()
				setHidden?.(false,)
			} else {
				log.debug('hiding seen comments',)
				oldThings.forEach(collapse,)
				setHidden?.(true,)
			}
		},
		handleOldExpandClick (element: Element, event: Event,) {
			const target = event.target instanceof Element ? event.target : null
			// An old-reddit comment contains its whole reply tree, so a click on a (new) reply
			// would otherwise bubble up and reveal the hidden parent too. Only the comment's own
			// area counts. The re-hide link is excluded so the click that hides it isn't undone.
			if (!target || adapter.getOwningThing(target,) !== element) { return }
			if (target.closest(adapter.rehideOldSelector,)) { return }
			adapter.expandOldThing(element,)
			adapter.addRehideOldControl(element,)
		},
		handleRehideOldClick (element: Element,) {
			const thing = adapter.getOwningThing(element,)
			if (thing) { collapse(thing,) }
		},
	}
}
