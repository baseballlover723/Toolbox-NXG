/** Dropdown that applies one of the subreddit's named ban macros to the surrounding ban form. */

import {ActionSelect,} from '../../../../shared/controls/ActionSelect'
import {classes,} from '../../../../util/ui/reactMount'
import type {SavedBanMacro,} from '../schema'
import css from './BanMacroSelect.module.css'

/** Value of the placeholder option; the select always rests on it so a macro can be re-applied. */
const placeholderValue = ''

/** Props for the BanMacroSelect component. */
interface BanMacroSelectProps {
	/** The macros to offer; the control renders nothing when the list is empty. */
	macros: SavedBanMacro[]
	/** Called with the chosen macro. The caller decides which of its fields apply to this surface. */
	onApply: (macro: SavedBanMacro,) => void
	/** Disables the control (e.g. while the surrounding form is saving). */
	disabled?: boolean
	/** Extra class for layout by the host form. */
	className?: string
}

/** Renders the "Apply ban macro..." picker, or nothing when the subreddit has no macros. */
export function BanMacroSelect ({macros, onApply, disabled, className,}: BanMacroSelectProps,) {
	if (macros.length === 0) { return null }

	return (
		<ActionSelect
			className={classes(css.select, className,)}
			aria-label="Apply ban macro"
			value={placeholderValue}
			disabled={disabled}
			onChange={(event,) => {
				const macro = macros[parseInt(event.target.value, 10,)]
				if (macro) { onApply(macro,) }
			}}
		>
			<option value={placeholderValue}>Apply ban macro...</option>
			{macros.map((macro, i,) => (
				<option key={macro.id ?? i} value={String(i,)}>
					{macro.title}
				</option>
			))}
		</ActionSelect>
	)
}
