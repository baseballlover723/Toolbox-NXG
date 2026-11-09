/** Controlled list editor for a subreddit's named ban macros (title, note, message, duration). */

import {useRef,} from 'react'

import {CheckboxInput,} from '../../../../shared/controls/CheckboxInput'
import {Icon,} from '../../../../shared/controls/Icon'
import {TextInput,} from '../../../../shared/controls/NormalInput'
import {TextareaInput,} from '../../../../shared/controls/TextareaInput'
import {TokenChips,} from '../../../../shared/controls/TokenChips'
import {
	banMacroTokens,
	clampBanDays,
	defaultBanMacroDays,
	maxBanMacroMessage,
	maxBanMacroNote,
	type SavedBanMacro,
} from '../schema'
import css from './SavedBanMacroList.module.css'

/** Props for the SavedBanMacroList component. */
interface SavedBanMacroListProps {
	/** The macros being edited. */
	macros: SavedBanMacro[]
	/** Called with the full replacement list after every edit. */
	onChange: (macros: SavedBanMacro[],) => void
}

/** Props for a single editable macro card. */
interface MacroCardProps {
	macro: SavedBanMacro
	index: number
	count: number
	onUpdate: (patch: Partial<SavedBanMacro>,) => void
	onMove: (offset: -1 | 1,) => void
	onRemove: () => void
}

/** One macro's fields plus its reorder/delete controls. */
function MacroCard ({macro, index, count, onUpdate, onMove, onRemove,}: MacroCardProps,) {
	const noteRef = useRef<HTMLInputElement>(null,)
	const messageRef = useRef<HTMLTextAreaElement>(null,)
	const idBase = `saved-ban-macro-${index}`

	return (
		<div className={css.card}>
			<div className={css.cardHeader}>
				<TextInput
					aria-label="Ban macro title"
					className={css.title}
					placeholder="Title shown in the picker"
					value={macro.title}
					onChange={(e,) => onUpdate({title: e.target.value,},)}
				/>
				<button
					type="button"
					className={css.iconBtn}
					aria-label="Move up"
					disabled={index === 0}
					onClick={() => onMove(-1,)}
				>
					<Icon icon="sortUp" />
				</button>
				<button
					type="button"
					className={css.iconBtn}
					aria-label="Move down"
					disabled={index === count - 1}
					onClick={() => onMove(1,)}
				>
					<Icon icon="sortDown" />
				</button>
				<button type="button" className={css.iconBtn} aria-label="Delete ban macro" onClick={onRemove}>
					<Icon icon="delete" mood="negative" />
				</button>
			</div>
			<label className={css.fieldLabel} htmlFor={`${idBase}-note`}>Mod note (internal)</label>
			<TokenChips
				tokens={banMacroTokens}
				inputRef={noteRef}
				onChange={(note,) => onUpdate({note,},)}
			>
				<TextInput
					id={`${idBase}-note`}
					ref={noteRef}
					type="text"
					className={css.fullWidth}
					value={macro.note}
					maxLength={maxBanMacroNote}
					onChange={(e,) => onUpdate({note: e.target.value,},)}
				/>
			</TokenChips>
			<span className={css.hint}>
				Visible only to moderators ({maxBanMacroNote - macro.note.length} chars remaining).
			</span>
			<label className={css.fieldLabel} htmlFor={`${idBase}-message`}>Ban message (sent to user)</label>
			<TokenChips
				tokens={banMacroTokens}
				inputRef={messageRef}
				onChange={(message,) => onUpdate({message,},)}
			>
				<TextareaInput
					id={`${idBase}-message`}
					ref={messageRef}
					rows={Math.max(3, macro.message.split('\n',).length,)}
					value={macro.message}
					maxLength={maxBanMacroMessage}
					onChange={(e,) => onUpdate({message: e.target.value,},)}
				/>
			</TokenChips>
			<span className={css.hint}>
				Sent to the user when banned ({maxBanMacroMessage - macro.message.length} chars remaining).
			</span>
			<div className={css.durationRow}>
				<CheckboxInput
					label="Permanent"
					checked={macro.permanent}
					// Remove-all is only for permanent bans, so a temporary macro must not keep it.
					onChange={(e,) =>
						onUpdate(e.target.checked ? {permanent: true,} : {permanent: false, removeAll: false,},)}
				/>
				{macro.permanent && (
					<CheckboxInput
						label="Remove all posts & comments"
						checked={macro.removeAll === true}
						onChange={(e,) => onUpdate({removeAll: e.target.checked,},)}
					/>
				)}
				{!macro.permanent && (
					<label className={css.daysLabel}>
						<TextInput
							type="number"
							min={1}
							max={999}
							className={css.daysInput}
							value={String(macro.days,)}
							onChange={(e,) => {
								const n = parseInt(e.target.value, 10,)
								if (!isNaN(n,)) { onUpdate({days: clampBanDays(n,),},) }
							}}
						/>
						days
					</label>
				)}
			</div>
			{macro.permanent && macro.removeAll && (
				<p className={css.hint}>
					Applies in the mod button and removal reasons ban forms; the usernote and native note ban options
					can&apos;t remove content and ignore it.
				</p>
			)}
		</div>
	)
}

/** Renders the editable list of named ban macros with an add button. */
export function SavedBanMacroList ({macros, onChange,}: SavedBanMacroListProps,) {
	const update = (index: number, patch: Partial<SavedBanMacro>,) =>
		onChange(macros.map((m, i,) => i === index ? {...m, ...patch,} : m),)

	const move = (index: number, offset: -1 | 1,) => {
		const target = index + offset
		if (target < 0 || target >= macros.length) { return }
		const next = [...macros,]
		const [moved,] = next.splice(index, 1,)
		if (moved) { next.splice(target, 0, moved,) }
		onChange(next,)
	}

	const add = () =>
		onChange([...macros, {title: '', note: '', message: '', permanent: false, days: defaultBanMacroDays,},],)

	return (
		<div className={css.root}>
			{macros.map((macro, i,) => (
				<MacroCard
					key={macro.id ?? `new-${i}`}
					macro={macro}
					index={i}
					count={macros.length}
					onUpdate={(patch,) => update(i, patch,)}
					onMove={(offset,) => move(i, offset,)}
					onRemove={() => onChange(macros.filter((_, j,) => j !== i),)}
				/>
			))}
			<button type="button" className={css.addBtn} onClick={add}>
				<Icon icon="addBox" mood="positive" />
				Add ban macro
			</button>
		</div>
	)
}
