/** Popup showing a user's native Reddit mod log (notes and mod actions) with a composer for new notes. */

import {Provider,} from 'react-redux'

import {nativeModLog,} from '../../../framework/moduleIds'
import {Window,} from '../../../shared/window/Window'
import {WindowTabs,} from '../../../shared/window/WindowTabs'
import store from '../../../store'
import {selectorOptionKey,} from '../../../util/data/string'
import {useSetting,} from '../../../util/ui/hooks'
import {mountPopup,} from '../../../util/ui/reactMount'
import type {ResolvedBanDefaults, SavedBanMacro,} from '../../shared/banMacros/schema'
import {ModNotesPager,} from '../../shared/modnotes/ModNotesPager'
import {defaultNoteLabelValueToLabelType,} from '../../shared/modnotes/schema'
import {defaultTabIndex, visibleTabs,} from '../schema'
import css from './NativeModLogPopup.module.css'
import {NativeNoteComposer,} from './NativeNoteComposer'

/** Props for the NativeModLogPopup component. */
export interface NativeModLogPopupProps {
	subreddit: string
	user: string
	/** Fullname of the post or comment the popup was opened from, attached to new notes as context. */
	contextID?: string | undefined
	/** When true, the composer's ban options are suppressed since mods cannot be banned. */
	targetIsMod?: boolean | undefined
	/** The subreddit's named ban macros, offered when a ban is issued with a note. */
	savedBanMacros?: SavedBanMacro[]
	/** Token values for ban messages; see the composer's prop of the same name. */
	banTokenInfo?: Record<string, string>
	/** The subreddit's resolved ban defaults, which the composer's ban fields start from. */
	banDefaults?: ResolvedBanDefaults | undefined
	/** Whether this subreddit requires a message on every ban. */
	requireBanMessage?: boolean
	/** Where to position the draggable popup on initial render. */
	initialPosition: {top: number; left: number}
	onClose: () => void
}

/** Renders the All Activity / Notes / Mod Actions tabs for a user, with the note composer below. */
export function NativeModLogPopup ({
	subreddit,
	user,
	contextID,
	targetIsMod = false,
	savedBanMacros = [],
	banTokenInfo,
	banDefaults,
	requireBanMessage = false,
	initialPosition,
	onClose,
}: NativeModLogPopupProps,) {
	const defaultTabName = useSetting(nativeModLog, 'defaultTabName', 'all_activity',)
	const defaultNoteLabel = useSetting(nativeModLog, 'defaultNoteLabel', 'none',)
	const showAiSummaries = !!useSetting(nativeModLog, 'showAiSummaries', false,)
	const showModActions = !!useSetting(nativeModLog, 'showModActions', true,)

	const tabs = visibleTabs(showModActions,)
	// A selector setting reads back as either the derived key or the raw display
	// label, so normalize both settings before looking them up.
	const initialTabIndex = defaultTabIndex(tabs, selectorOptionKey(defaultTabName,),)
	const defaultLabel = defaultNoteLabelValueToLabelType[selectorOptionKey(defaultNoteLabel,)]

	return (
		<Window
			title={
				<span>
					Native mod log - <a href={`/user/${user}`}>/u/{user}</a> in /r/{subreddit}
				</span>
			}
			draggable
			initialPosition={initialPosition}
			className={css.popup}
			onClose={onClose}
		>
			<WindowTabs
				tabs={tabs.map((tab,) => ({
					title: tab.title,
					content: (
						<div className={css.history}>
							<ModNotesPager
								user={user}
								subreddit={subreddit}
								hideAiSummaries={!showAiSummaries}
								{...(tab.filter !== undefined && {filter: tab.filter,})}
							/>
						</div>
					),
				}))}
				defaultTabIndex={initialTabIndex}
				footer={
					<NativeNoteComposer
						subreddit={subreddit}
						user={user}
						contextID={contextID}
						defaultLabel={defaultLabel}
						targetIsMod={targetIsMod}
						savedBanMacros={savedBanMacros}
						{...(banTokenInfo ? {banTokenInfo,} : {})}
						banDefaults={banDefaults}
						requireBanMessage={requireBanMessage}
						onSaved={onClose}
					/>
				}
			/>
		</Window>
	)
}

/**
 * Mounts the NativeModLogPopup as a managed popup and returns a cleanup function.
 * @param props Popup props; `onClose` is supplied by the popup manager.
 */
export function showNativeModLogPopup (props: Omit<NativeModLogPopupProps, 'onClose'>,) {
	return mountPopup(
		(onClose,) => (
			<Provider store={store}>
				<NativeModLogPopup {...props} onClose={onClose} />
			</Provider>
		),
		undefined,
		// Per-target: re-opening from the same post or comment reveals the live popup instead
		// of mounting a duplicate (losing typed text). The item is part of the key because the
		// composer attaches new notes to it: keyed by user alone, opening the log from a second
		// comment revealed the first popup, and its note was linked to the wrong comment.
		`nativemodlog:${props.subreddit}:${props.user}:${props.contextID ?? ''}`,
	)
}
