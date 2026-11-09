/** Clickable "M" button that fetches thing info and opens the ModButtonPopup. */

import {getCurrentUser,} from '../../../api/resources/me'
import {sendModmail,} from '../../../api/resources/modmail'
import {addContributor, addModerator, removeContributor, removeModerator,} from '../../../api/resources/relationships'
import {AuthorButton,} from '../../../shared/controls/AuthorButton'
import {GeneralButton,} from '../../../shared/controls/GeneralButton'
import {negativeTextFeedback,} from '../../../store/feedback'
import {link,} from '../../../util/reddit/pageContext'
import type {ThingInfo,} from '../../../util/reddit/thingInfo'
import {getApiThingInfo,} from '../../../util/reddit/thingInfo'
import {drawPosition,} from '../../../util/ui/drawPosition'
import {getConfig,} from '../../config/moduleapi'
import {requestCounterRefresh,} from '../../notifier/store'
import {getSavedBanMacros,} from '../../shared/banMacros/moduleapi'
import {
	proposeOrBan,
	proposeOrMute,
	proposeOrUnban,
	proposeOrUnmute,
	proposeOrUserFlair,
	removeAllUserContent as removeAllInSubreddit,
} from '../../shared/proposals/gateway'
import {activeNotes, getUser, getUserNotes,} from '../../shared/usernotes/moduleapi'
import {type BanMacros, type ModButtonActions,} from '../schema'
import {type ModButtonSettings,} from '../settings'
import {showModButtonPopup,} from './ModButtonPopup'

const titleText = 'Perform various mod actions on this user'

/** Props for the ModButtonUserRoot component. */
interface ModButtonUserRootProps {
	/** The username of the author the button acts on. */
	author: string
	/** The subreddit context (used to pre-select the active sub in the popup). */
	subreddit: string
	/** The fullname of the parent post or comment, used to fetch full thing info. */
	parentId: string
	/** Button label text; defaults to `'M'`. */
	label?: string
	/** Whether to render using the compact author-row button style. */
	authorButton?: boolean
	className?: string
	savedSubs: ModButtonSettings['savedSubs']
	rememberLastAction: ModButtonSettings['rememberLastAction']
	globalButton: ModButtonSettings['globalButton']
	excludeGlobal: ModButtonSettings['excludeGlobal']
	lastAction: ModButtonSettings['lastAction']
	/** Called to persist a new last-action value after a successful mod action. */
	setLastAction: (action: string,) => void
	/** Called to persist changes to the pinned-subs list. */
	setSavedSubs: (subs: string[],) => void
}

/** Builds a user-targeted proposal context for the gateway capture verbs. */
function userCtx (subreddit: string, user: string,) {
	return {
		subreddit,
		itemId: user,
		itemKind: 'user' as const,
		link: `https://www.reddit.com/user/${user}`,
	}
}

/** Builds the ModButtonActions implementation backed by the real API functions. */
function createActions (): ModButtonActions {
	return {
		async ban ({user, subreddit, note, banMessage, banDuration, banContext,},) {
			await proposeOrBan(userCtx(subreddit, user,), {
				// banDuration 0/undefined means a permanent ban.
				permanent: !banDuration,
				days: banDuration ?? 0,
				note: note ?? '',
				message: banMessage ?? '',
				...(banContext ? {context: banContext,} : {}),
			},)
		},
		async unban (subreddit, user,) {
			await proposeOrUnban(userCtx(subreddit, user,),)
		},
		async addContributor (subreddit, user,) {
			await addContributor(subreddit, user,)
		},
		async removeContributor (subreddit, user,) {
			await removeContributor(subreddit, user,)
		},
		async addModerator (subreddit, user,) {
			await addModerator(subreddit, user,)
		},
		async removeModerator (subreddit, user,) {
			await removeModerator(subreddit, user,)
		},
		async muteUser (params,) {
			await proposeOrMute(userCtx(params.subreddit, params.user,), {
				...(params.duration ? {duration: params.duration,} : {}),
			},)
		},
		async unmuteUser (subreddit, user,) {
			await proposeOrUnmute(userCtx(subreddit, user,),)
		},
		async removeAllUserContent (subreddit, user,) {
			if (await removeAllInSubreddit(subreddit, user,) === 'refused') {
				negativeTextFeedback('Bulk removal is not available in training mode',)
			}
		},
		async flairUser (params,) {
			const {user, subreddit, ...flair} = params
			await proposeOrUserFlair(userCtx(subreddit, user,), flair,)
		},
		async sendModmail (params,) {
			await sendModmail(params,)
		},
		async getBanMacros (subreddit,) {
			const config = await getConfig(subreddit,)
			if (!config || typeof config.banMacros !== 'object' || !config.banMacros) { return null }
			return config.banMacros as BanMacros
		},
		getSavedBanMacros (subreddit,) {
			return getSavedBanMacros(subreddit,)
		},
		async suggestBanNote (subreddit, user,) {
			const notesData = await getUserNotes(subreddit,)
			const found = getUser(notesData.users, user,)
			const visible = found ? activeNotes(found.notes,) : []
			if (visible.length === 0) { return null }
			return visible[0]!.note
		},
		refreshCounters () {
			requestCounterRefresh()
		},
	}
}

/** Renders the mod button and, on click, fetches thing info then opens the ModButtonPopup. */
export function ModButtonUserRoot ({
	author,
	subreddit,
	parentId,
	label = 'M',
	authorButton = false,
	className,
	savedSubs,
	rememberLastAction,
	globalButton,
	excludeGlobal,
	lastAction,
	setLastAction,
	setSavedSubs,
}: ModButtonUserRootProps,) {
	async function handleClick (e: React.MouseEvent<HTMLButtonElement>,) {
		e.preventDefault()
		e.stopPropagation()

		if (!author) {
			negativeTextFeedback('No user',)
			return
		}

		const positions = drawPosition(e.nativeEvent as MouseEvent,)

		let info: ThingInfo
		if (!parentId || !subreddit || parentId === 'unknown' || parentId === 'undefined') {
			info = {
				subreddit,
				user: author,
				author,
				permalink: location.href,
				url: location.href,
				domain: '',
				fullname: parentId,
				id: parentId,
				body: '>',
				raw_body: '',
				uri_body: '',
				approved_by: '',
				title: '',
				uri_title: '',
				kind: 'comment',
				postlink: '',
				link: '',
				banned_by: '',
				spam: '',
				ham: '',
				rules: subreddit ? link(`/r/${subreddit}/about/rules`,) : '',
				sidebar: subreddit ? link(`/r/${subreddit}/about/sidebar`,) : '',
				wiki: subreddit ? link(`/r/${subreddit}/wiki/index`,) : '',
				mod: await getCurrentUser(),
			}
		} else {
			info = await getApiThingInfo(subreddit, parentId, true,)
			if (!info.author) {
				info.author = info.user = author
			}
		}

		showModButtonPopup({
			info,
			initialPosition: {top: positions.topPosition, left: positions.leftPosition,},
			rememberLastAction,
			globalButton,
			excludeGlobal,
			savedSubs,
			onSavedSubsChange: setSavedSubs,
			lastAction,
			setLastAction,
			actions: createActions(),
		},)
	}

	const Button = authorButton ? AuthorButton : GeneralButton
	return (
		<Button type="button" className={className} title={titleText} onClick={(e,) => void handleClick(e,)}>
			{label}
		</Button>
	)
}
