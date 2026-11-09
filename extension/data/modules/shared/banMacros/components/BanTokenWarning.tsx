/** Inline warning that a ban message still contains tokens the form couldn't fill. */

import {unresolvedBanTokens,} from '../schema'
import css from './BanTokenWarning.module.css'

/**
 * Names any ban tokens left in `text` (e.g. `{url}` in a form opened without a post or comment)
 * so they're never sent by surprise: they stay in the message as written until the mod edits them.
 * Renders nothing when every token was filled.
 * @param text The ban message as it will be sent.
 */
export function BanTokenWarning ({text,}: {text: string},) {
	const unresolved = unresolvedBanTokens(text,)
	if (unresolved.length === 0) { return null }
	return (
		<p className={css.warning} role="status">
			{unresolved.join(', ',)} can&apos;t be filled in here and will be sent as written. Edit{' '}
			{unresolved.length === 1 ? 'it' : 'them'} out, or open this form from the post or comment.
		</p>
	)
}
