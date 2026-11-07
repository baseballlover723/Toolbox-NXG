/** Composer for adding a native Reddit mod note, with an optional ban for the Ban / Permaban labels. */

import {useEffect, useRef, useState,} from 'react'

import {createModNote,} from '../../../api/resources/modnotes'
import {ActionButton,} from '../../../shared/controls/ActionButton'
import {positiveTextFeedback,} from '../../../store/feedback'
import createLogger from '../../../util/infra/logging'
import {labelColors, maxNativeNoteLength, selectableLabelNames,} from '../../shared/modnotes/schema'
import {proposeOrBan,} from '../../shared/proposals/gateway'
import css from './NativeNoteComposer.module.css'

const log = createLogger('NativeModLog',)

/** Props for the NativeNoteComposer component. */
export interface NativeNoteComposerProps {
	subreddit: string
	user: string
	/** Fullname of the post or comment the note is about, if the composer was opened from one. */
	contextID?: string | undefined
	/** API label to preselect (e.g. `'BAN'`), or undefined for no label. */
	defaultLabel?: string | undefined
	/** When true, the ban options are suppressed since mods cannot be banned. */
	targetIsMod?: boolean | undefined
	/** Called after the note (and any ban) has been saved. */
	onSaved: () => void
}

/** True for the labels that offer to ban the user alongside the note. */
function isBanLabel (label: string | undefined,): label is 'BAN' | 'PERMA_BAN' {
	return label === 'BAN' || label === 'PERMA_BAN'
}

/** Renders the label chips, note input, and ban controls for a new native mod note. */
export function NativeNoteComposer ({
	subreddit,
	user,
	contextID,
	defaultLabel,
	targetIsMod = false,
	onSaved,
}: NativeNoteComposerProps,) {
	const inputRef = useRef<HTMLInputElement>(null,)
	const [noteText, setNoteText,] = useState('',)
	const [selectedLabel, setSelectedLabel,] = useState<string | undefined>(defaultLabel,)
	const [saving, setSaving,] = useState(false,)
	const [error, setError,] = useState<string | undefined>()
	const [triggerBan, setTriggerBan,] = useState(true,)
	const [banDays, setBanDays,] = useState(7,)
	const [banMessage, setBanMessage,] = useState('',)

	// Using autoFocus would make the page jump; focus manually without scrolling instead.
	useEffect(() => {
		inputRef.current?.focus({preventScroll: true,},)
	}, [],)

	// Switching label resets the ban options so a stale choice never carries over.
	useEffect(() => {
		setTriggerBan(true,)
		setBanDays(7,)
		setBanMessage('',)
	}, [selectedLabel,],)

	const showBanFields = isBanLabel(selectedLabel,) && triggerBan && !targetIsMod

	async function handleSave () {
		const text = noteText.trim()
		if (!text) {
			setError('Note text is required',)
			return
		}
		setError(undefined,)
		setSaving(true,)
		try {
			await createModNote({
				user,
				subreddit,
				redditID: contextID,
				note: text,
				label: selectedLabel,
			},)
			// The ban toggle reads unchecked for a mod but its state stays on, so check
			// targetIsMod here too - mods can't be banned.
			if (triggerBan && !targetIsMod && isBanLabel(selectedLabel,)) {
				await proposeOrBan(
					{subreddit, itemId: user, itemKind: 'user', link: `https://www.reddit.com/user/${user}`,},
					{
						permanent: selectedLabel === 'PERMA_BAN',
						days: banDays,
						note: text,
						message: banMessage,
					},
				)
			}
			positiveTextFeedback('Note saved',)
			setNoteText('',)
			onSaved()
		} catch (saveError) {
			log.error('Failed to create native note:', saveError,)
			setError('Failed to save note',)
		} finally {
			setSaving(false,)
		}
	}

	return (
		<section className={css.composerPane} aria-label="Create native note">
			<div className={css.composerHeader}>
				<span>Add native note</span>
			</div>
			<div className={css.typeList}>
				{Object.entries(selectableLabelNames,).map(([key, name,],) => (
					<button
						type="button"
						key={key}
						className={`${css.typeButton} ${selectedLabel === key ? css.selectedType : ''}`}
						style={{color: labelColors[key],}}
						aria-pressed={selectedLabel === key}
						onClick={() => setSelectedLabel((prev,) => prev === key ? undefined : key)}
						disabled={saving}
					>
						{name}
					</button>
				))}
			</div>
			<input
				ref={inputRef}
				type="text"
				className={`${css.noteInput} toolbox-input`}
				placeholder="Add a note..."
				maxLength={maxNativeNoteLength}
				value={noteText}
				disabled={saving}
				onChange={(event,) => {
					setNoteText(event.target.value,)
					if (error) { setError(undefined,) }
				}}
				onKeyDown={(event,) => {
					if (event.key === 'Enter') {
						event.preventDefault()
						void handleSave()
					}
				}}
			/>
			{showBanFields && (
				<textarea
					className={`${css.banMessageInput} toolbox-input`}
					placeholder="ban note to user"
					rows={2}
					value={banMessage}
					disabled={saving}
					onChange={(event,) => setBanMessage(event.target.value,)}
				/>
			)}
			<div className={css.composerFooter}>
				{selectedLabel === 'PERMA_BAN' && (
					<label className={css.banRow}>
						<input
							type="checkbox"
							className={css.toggle}
							checked={triggerBan && !targetIsMod}
							disabled={saving || targetIsMod}
							onChange={(event,) => setTriggerBan(event.target.checked,)}
						/>
						<span>Issue Permanent Ban{targetIsMod ? ' (user is a mod)' : ''}</span>
					</label>
				)}
				{selectedLabel === 'BAN' && (
					<label className={css.banRow}>
						<input
							type="checkbox"
							className={css.toggle}
							checked={triggerBan && !targetIsMod}
							disabled={saving || targetIsMod}
							onChange={(event,) => setTriggerBan(event.target.checked,)}
						/>
						<span>Issue Ban{targetIsMod ? ' (user is a mod)' : ' for'}</span>
						{!targetIsMod && (
							<>
								<input
									type="number"
									className={`${css.banDaysInput} toolbox-input`}
									min={1}
									max={999}
									value={banDays}
									disabled={saving || !triggerBan}
									onChange={(event,) => {
										const days = parseInt(event.target.value, 10,)
										if (!isNaN(days,) && days >= 1 && days <= 999) { setBanDays(days,) }
									}}
								/>
								<span>days</span>
							</>
						)}
					</label>
				)}
				{error && <span className={css.error}>{error}</span>}
				<ActionButton type="button" primary disabled={saving} onClick={() => void handleSave()}>
					{saving ? 'Saving...' : `Save for /r/${subreddit}`}
				</ActionButton>
			</div>
		</section>
	)
}
