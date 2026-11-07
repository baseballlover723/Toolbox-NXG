/** Author-line `NN` tag showing a user's latest native mod log entry. */

import {AuthorButton,} from '../../../shared/controls/AuthorButton'
import {labelColors, type ModNote, typeNames,} from '../../shared/modnotes/schema'
import {aiSummaryLabel, isAiSummary,} from '../schema'
import css from './NativeModLogBadge.module.css'

/** Props for the NativeModLogBadge component. */
interface NativeModLogBadgeProps {
	user: string
	subreddit: string
	/** The latest visible native mod log entry, or null/undefined when there is none (or it is still loading). */
	note?: ModNote | null | undefined
	onClick: React.MouseEventHandler<HTMLButtonElement>
}

/** Text shown when the user has no visible native mod log entry. */
const fallbackText = 'NN'

/**
 * Renders the `NN` tag. A note shows its text in its label color; an AI summary is
 * shortened to "AI summary" (full text in the tooltip) so it can't flood the author
 * line; a mod action shows the action's type name.
 */
export function NativeModLogBadge ({user, subreddit, note, onClick,}: NativeModLogBadgeProps,) {
	const baseTitle = `Native mod log for /u/${user} in /r/${subreddit}`
	let contents: React.ReactNode = fallbackText
	let title = baseTitle

	if (note?.user_note_data) {
		const noteText = note.user_note_data.note
		const label = note.user_note_data.label
		const color = label != null ? labelColors[label] : undefined
		if (isAiSummary(note,)) {
			contents = <b style={{color: labelColors[aiSummaryLabel],}}>AI summary</b>
		} else {
			contents = <b style={color ? {color,} : undefined}>{noteText}</b>
		}
		title = `${noteText}\n\n${baseTitle}`
	} else if (note?.mod_action_data) {
		const actionName = typeNames[note.type] ?? note.mod_action_data.action
		contents = <i>{actionName}</i>
		title = `Latest mod action: ${note.mod_action_data.action}\n\n${baseTitle}`
	}

	return (
		<AuthorButton
			type="button"
			className={css.badge}
			title={title}
			onClick={onClick}
		>
			{contents}
		</AuthorButton>
	)
}
