/** Popup showing a user's native Reddit mod log (notes and mod actions) with a composer for new notes. */

import {Provider,} from 'react-redux'

import {nativeModLog,} from '../../../framework/moduleIds'
import {Window,} from '../../../shared/window/Window'
import {WindowTabs,} from '../../../shared/window/WindowTabs'
import store from '../../../store'
import {selectorOptionKey,} from '../../../util/data/string'
import {useSetting,} from '../../../util/ui/hooks'
import {mountPopup,} from '../../../util/ui/reactMount'
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
		// Per-target: popups for distinct users coexist; re-opening the same user's
		// log reveals the live popup instead of mounting a duplicate (losing typed text).
		`nativemodlog:${props.subreddit}:${props.user}`,
	)
}
