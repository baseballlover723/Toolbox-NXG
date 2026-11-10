/** DOM rendering for the Native Mod Log module: the `NN` author tag and the popup it opens. */

import {useEffect, useState,} from 'react'

import {getCurrentUser,} from '../../api/resources/me'
import {isModSub,} from '../../api/resources/modSubs'
import {getModeratorListResult,} from '../../api/resources/relationships'
import {renderAtLocation, type UILocationContext,} from '../../dom/uiLocations'
import {createLifecycle,} from '../../framework/lifecycle'
import createLogger from '../../util/infra/logging'
import {isUserProfileSubreddit,} from '../../util/reddit/profileSubreddit'
import {getApiThingInfo,} from '../../util/reddit/thingInfo'
import {drawPosition,} from '../../util/ui/drawPosition'
import {useFetched,} from '../../util/ui/hooks'
import {getBanFormSettings,} from '../shared/banMacros/moduleapi'
import {banTokenInfo, resolveBanDefaults,} from '../shared/banMacros/schema'
import type {ModNote,} from '../shared/modnotes/schema'
import {NativeModLogBadge,} from './components/NativeModLogBadge'
import {showNativeModLogPopup,} from './components/NativeModLogPopup'
import {createLatestEntryFetcher,} from './moduleapi'
import type {NativeModLogSettings,} from './settings'

const log = createLogger('NativeModLog',)

/** Handlers returned by {@link createNativeModLogDisplay}. */
export interface NativeModLogDisplayHandlers {
	/** Unregisters the `NN` tag renderer. Pass to `lifecycle.mount` in `index.ts`. */
	cleanup: () => Promise<void>
}

/** Fullname of the post or comment a location refers to, if it is one notes can be attached to. */
function contextFullname (context: UILocationContext,): string | undefined {
	// Modmail locations carry a conversation, which a mod note can't reference.
	if ((context.rawDetail as {conversationId?: string} | undefined)?.conversationId) { return undefined }
	return context.thingId && /^t[13]_/.test(context.thingId,) ? context.thingId : undefined
}

/**
 * Creates the `NN` tag renderer for the Native Mod Log module. The tag shows the
 * user's latest visible native mod log entry and opens the full log on click.
 * Registers at the `authorActions` UI location, after the usernote tag.
 */
export function createNativeModLogDisplay (
	{showAiSummaries, showModActions, maxChars,}: NativeModLogSettings,
): NativeModLogDisplayHandlers {
	const lifecycle = createLifecycle()
	const getLatestEntry = createLatestEntryFetcher({showAiSummaries, showModActions,},)

	async function openPopup (context: UILocationContext, event: React.MouseEvent<HTMLButtonElement>,) {
		const {author, subreddit,} = context
		if (!author || !subreddit) { return }
		const positions = drawPosition(event.nativeEvent,)
		const contextID = contextFullname(context,)
		const [{targetIsMod,}, banSettings, currentUser, thing,] = await Promise.all([
			getModeratorListResult(subreddit, author, '',).catch(() => ({targetIsMod: false,})),
			getBanFormSettings(subreddit,),
			getCurrentUser().catch(() => ''),
			// The item the log was opened from fills {kind}, {title}, {url} and {body} in ban messages.
			contextID ? getApiThingInfo(subreddit, contextID,).catch(() => undefined) : undefined,
		],)
		const tokens = banTokenInfo({author, subreddit, mod: currentUser,}, thing,)
		showNativeModLogPopup({
			subreddit,
			user: author,
			contextID,
			targetIsMod,
			savedBanMacros: banSettings.savedBanMacros,
			banTokenInfo: tokens,
			banDefaults: resolveBanDefaults(banSettings.defaults, tokens,),
			requireBanMessage: banSettings.requireBanMessage,
			banDisabled: banSettings.disableNativeNoteBan,
			initialPosition: {top: positions.topPosition, left: positions.leftPosition,},
		},)
	}

	function NativeModLogTag ({context, author, subreddit,}: {
		context: UILocationContext
		author: string
		subreddit: string
	},) {
		const [isMod, setIsMod,] = useState(false,)

		useEffect(() => {
			let alive = true
			isModSub(subreddit,).then((mod,) => {
				if (alive) { setIsMod(mod,) }
			},).catch((error: unknown,) => log.error(error,))
			return () => {
				alive = false
			}
		}, [subreddit,],)

		// Only mods can read the log, so don't queue a lookup until that's known.
		if (!isMod) { return null }
		return <NativeModLogEntryTag context={context} author={author} subreddit={subreddit} />
	}

	function NativeModLogEntryTag ({context, author, subreddit,}: {
		context: UILocationContext
		author: string
		subreddit: string
	},) {
		// Start the lookup once per mount; calling the fetcher on every render would
		// queue a duplicate request into the batch each time.
		const [latestEntry,] = useState(() => getLatestEntry(subreddit, author,))
		const note: ModNote | null | undefined = useFetched(latestEntry,)
		return (
			<NativeModLogBadge
				user={author}
				subreddit={subreddit}
				note={note}
				maxChars={maxChars}
				onClick={(event,) => {
					event.preventDefault()
					event.stopPropagation()
					openPopup(context, event,).catch((error: unknown,) =>
						log.error('Failed to open native mod log:', error,)
					)
				}}
			/>
		)
	}

	renderAtLocation('authorActions', {id: 'nativemodlog.badge', order: 15, lifecycle,}, ({context,},) => {
		const {author, subreddit,} = context
		// Deleted accounts and user-profile pseudo-subreddits can't have a mod log.
		if (!author || author === '[deleted]' || !subreddit || isUserProfileSubreddit(subreddit,)) { return null }
		return <NativeModLogTag context={context} author={author} subreddit={subreddit} />
	},)

	return {cleanup: lifecycle.cleanup,}
}
