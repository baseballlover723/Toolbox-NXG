/** DOM finders for mod-notes-opener elements outside of feed credit bars. */

import {isThingRemoved,} from './things'

/** Data extracted from a mod-notes-opener element outside feed credit bars. */
export interface ModNotesTarget {
	opener: Element
	author: string
	subreddit: string
	thingId: string
	postId: string
	conversationId: string | null
	/**
	 * The ancestor shreddit-comment, shreddit-post, or mod-queue-list-item that still needs a
	 * thing-level container, or null when none was found or one already exists.
	 */
	thingAncestor: Element | null
	/** Whether the thing has been removed. */
	isRemoved: boolean
}

/** Fullname of a shreddit-comment (`thingid`) or shreddit-post (`id`), or `''` when it has none. */
function ancestorFullname (ancestor: Element | null,): string {
	if (!ancestor) { return '' }
	const id = ancestor.getAttribute('thingid',) || ancestor.getAttribute('id',) || ''
	return /^t[13]_/.test(id,) ? id : ''
}

/**
 * Find mod-notes-opener elements that need a toolbox author anchor.
 * Skips openers inside feed credit bars (handled by findCreditBarTargets), hover card
 * slots, avatar slots, and those already processed (marked with a .toolbox-author-slot
 * next sibling).
 *
 * Note: mod-queue-list-item is included in ancestor lookups for forward compatibility,
 * but current Reddit queues render shreddit-post/shreddit-comment with view-context="ModQueue".
 */
export function findModNotesTargets (root: Element,): ModNotesTarget[] {
	const results: ModNotesTarget[] = []
	for (const opener of root.querySelectorAll('mod-notes-opener',)) {
		if (opener.closest('[id^="feed-post-credit-bar-"]',)) { continue }
		if (opener.closest('[slot="content"]',)) { continue }
		if (opener.closest('[slot="commentAvatar"]',)) { continue }
		if (opener.nextElementSibling?.classList.contains('toolbox-author-slot',)) { continue }

		const author = opener.getAttribute('user-name',)
		const subreddit = opener.getAttribute('subreddit-name',)
		if (!author || !subreddit) { continue }

		const ancestor = opener.closest('shreddit-comment',)
			?? opener.closest('shreddit-post',)
			?? opener.closest('mod-queue-list-item',)
		// The opener normally carries the fullname, but fall back to the enclosing comment or
		// post so a native note written from here is still attached to the item.
		const thingId = opener.getAttribute('thing-id',)
			|| ancestorFullname(ancestor,)
		const postId = opener.getAttribute('post-id',) ?? ''
		const conversationId = opener.getAttribute('conversation-id',)
		const thingAncestor = ancestor && !ancestor.querySelector(':scope > .toolbox-thing-slot',)
			? ancestor
			: null
		const removed = ancestor ? isThingRemoved(ancestor,) : false

		results.push({opener, author, subreddit, thingId, postId, conversationId, thingAncestor, isRemoved: removed,},)
	}
	return results
}
