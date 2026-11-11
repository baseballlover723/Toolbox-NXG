/** Panel under the queue toolbar's "select..." button: criteria for filtering the queue or selecting items. */

import {type KeyboardEvent, type ReactNode,} from 'react'

import {CheckboxInput,} from '../../../shared/controls/CheckboxInput'
import {GeneralButton,} from '../../../shared/controls/GeneralButton'
import {TextInput,} from '../../../shared/controls/NormalInput'
import {classes,} from '../../../util/ui/reactMount'
import {
	isEmptyCriteria,
	type ItemKind,
	itemKindLabels,
	itemKinds,
	type ItemState,
	itemStateLabels,
	itemStates,
	type MatchCount,
	type NumberCriterionField,
	type SelectFilterCriteria,
	type SelectFilterMode,
	type SelectVerb,
	type TextCriterionField,
} from '../schema'
import css from './SelectFilterPanel.module.css'

/** Props for the SelectFilterPanel component. */
export interface SelectFilterPanelProps {
	/** The criteria being edited. */
	criteria: SelectFilterCriteria
	/** Called with the full updated criteria on every edit. */
	onCriteriaChange: (criteria: SelectFilterCriteria,) => void
	/** Whether applying filters the view or changes the selection. */
	mode: SelectFilterMode
	/** Called when the mod switches mode. */
	onModeChange: (mode: SelectFilterMode,) => void
	/** Live match count for the current criteria. */
	matchCount: MatchCount
	/** Whether this is a spam/trials queue, where report criteria don't apply. */
	viewingspam: boolean
	/** Called to show only the matching items. */
	onFilter: () => void
	/** Called to change the selection to, add, or remove the matching items. */
	onSelect: (verb: SelectVerb,) => void
	/** Called to clear every criterion. */
	onReset: () => void
	/** Called to close the panel without applying. */
	onClose: () => void
}

const textFieldLabels: Record<TextCriterionField, {label: string; placeholder: string}> = {
	users: {label: 'users', placeholder: 'name, name...',},
	domains: {label: 'domains', placeholder: 'youtube.com, imgur.com...',},
	subreddits: {label: 'subreddits', placeholder: 'sub, sub...',},
	title: {label: 'title contains', placeholder: 'text',},
	flairText: {label: 'flair contains', placeholder: 'text',},
	reportText: {label: 'report contains', placeholder: 'text',},
}

/** Parses a number input's value, treating empty or invalid input as "off". */
function parseNumber (value: string,): number | null {
	if (value.trim() === '') { return null }
	const n = Number(value,)
	return Number.isFinite(n,) ? n : null
}

/** A labeled row in the panel's grid. */
function Row ({label, children,}: {label: string; children: ReactNode},) {
	return (
		<div className={css.row}>
			<span className={css.rowLabel}>{label}</span>
			<div className={css.rowControls}>{children}</div>
		</div>
	)
}

/** Renders the select/filter criteria panel. */
export function SelectFilterPanel ({
	criteria,
	onCriteriaChange,
	mode,
	onModeChange,
	matchCount,
	viewingspam,
	onFilter,
	onSelect,
	onReset,
	onClose,
}: SelectFilterPanelProps,) {
	const empty = isEmptyCriteria(criteria,)

	/** Updates one field of the criteria. */
	function set<K extends keyof SelectFilterCriteria,> (key: K, value: SelectFilterCriteria[K],) {
		onCriteriaChange({...criteria, [key]: value,},)
	}

	/** Adds or removes a choice from the types or states group. */
	function toggleChoice<T extends ItemKind | ItemState,> (list: T[], choice: T, on: boolean,): T[] {
		return on ? [...list, choice,] : list.filter((entry,) => entry !== choice)
	}

	/** Enter applies the primary action for the current mode; Escape closes. */
	function handleKeyDown (event: KeyboardEvent<HTMLDivElement>,) {
		if (event.key === 'Escape') {
			event.preventDefault()
			onClose()
		} else if (
			event.key === 'Enter' && event.target instanceof HTMLInputElement && event.target.type !== 'checkbox'
		) {
			event.preventDefault()
			if (empty) { return }
			if (mode === 'filter') {
				onFilter()
			} else {
				onSelect('replace',)
			}
		}
	}

	const textFields: TextCriterionField[] = viewingspam
		? ['users', 'domains', 'subreddits', 'title', 'flairText',]
		: ['users', 'domains', 'subreddits', 'title', 'flairText', 'reportText',]

	const numberInput = (field: NumberCriterionField, label: string,) => (
		<label className={css.numberLabel}>
			{label}
			<TextInput
				type="number"
				className={css.number}
				value={criteria[field] ?? ''}
				onChange={(event,) => set(field, parseNumber(event.target.value,),)}
			/>
		</label>
	)

	return (
		<div
			className={css.panel}
			role="dialog"
			aria-label="Select or filter queue items"
			onClick={(event,) => event.stopPropagation()}
			onKeyDown={handleKeyDown}
		>
			<div className={css.modeSwitch} role="radiogroup" aria-label="What applying does">
				{(['filter', 'select',] as const).map((value,) => (
					<button
						key={value}
						type="button"
						role="radio"
						aria-checked={mode === value}
						className={classes(css.modeOption, mode === value && css.modeActive,)}
						onClick={() => onModeChange(value,)}
					>
						{value === 'filter' ? 'show only matching' : 'select matching'}
					</button>
				))}
			</div>

			<Row label="type">
				{itemKinds.map((kind,) => (
					<CheckboxInput
						key={kind}
						label={itemKindLabels[kind]}
						checked={criteria.types.includes(kind,)}
						onChange={(event,) => set('types', toggleChoice(criteria.types, kind, event.target.checked,),)}
					/>
				))}
				<CheckboxInput
					className={css.negate}
					label="not"
					title="match items that are none of these"
					checked={criteria.negateTypes}
					onChange={(event,) => set('negateTypes', event.target.checked,)}
				/>
			</Row>

			<Row label="state">
				{itemStates.map((state,) => (
					<CheckboxInput
						key={state}
						label={itemStateLabels[state]}
						checked={criteria.states.includes(state,)}
						onChange={(event,) =>
							set('states', toggleChoice(criteria.states, state, event.target.checked,),)}
					/>
				))}
				<CheckboxInput
					className={css.negate}
					label="not"
					title="match items in none of these states"
					checked={criteria.negateStates}
					onChange={(event,) => set('negateStates', event.target.checked,)}
				/>
			</Row>

			{textFields.map((field,) => (
				<Row key={field} label={textFieldLabels[field].label}>
					<TextInput
						type="text"
						className={css.text}
						aria-label={textFieldLabels[field].label}
						placeholder={textFieldLabels[field].placeholder}
						value={criteria[field].value}
						onChange={(event,) => set(field, {...criteria[field], value: event.target.value,},)}
					/>
					<CheckboxInput
						className={css.negate}
						label="not"
						title="match items that don't match this"
						checked={criteria[field].negate}
						onChange={(event,) => set(field, {...criteria[field], negate: event.target.checked,},)}
					/>
				</Row>
			))}

			<Row label="numbers">
				{!viewingspam && numberInput('minReports', 'reports at least',)}
				{numberInput('scoreAbove', 'score above',)}
				{numberInput('scoreBelow', 'score below',)}
			</Row>
			<Row label="age (hours)">
				{numberInput('olderThanHours', 'older than',)}
				{numberInput('newerThanHours', 'newer than',)}
			</Row>

			<div className={css.footer}>
				<span className={css.count} aria-live="polite">
					{empty ? 'no criteria set' : `${matchCount.matched} of ${matchCount.total} match`}
				</span>
				<GeneralButton type="button" disabled={empty} onClick={onReset}>reset</GeneralButton>
				<span className={css.footerActions}>
					{mode === 'filter'
						? (
							<GeneralButton type="button" disabled={empty} onClick={onFilter}>
								show only matching
							</GeneralButton>
						)
						: (
							<>
								<GeneralButton
									type="button"
									disabled={empty}
									title="select the matching items and nothing else"
									onClick={() => onSelect('replace',)}
								>
									select
								</GeneralButton>
								<GeneralButton
									type="button"
									disabled={empty}
									title="add the matching items to the current selection"
									onClick={() => onSelect('add',)}
								>
									add
								</GeneralButton>
								<GeneralButton
									type="button"
									disabled={empty}
									title="remove the matching items from the current selection"
									onClick={() => onSelect('deselect',)}
								>
									deselect
								</GeneralButton>
							</>
						)}
					<GeneralButton type="button" onClick={onClose}>close</GeneralButton>
				</span>
			</div>
		</div>
	)
}
