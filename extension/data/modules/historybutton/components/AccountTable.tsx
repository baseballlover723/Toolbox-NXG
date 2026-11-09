/** Table of off-site accounts (YouTube channels, X profiles, blogs, ...) found in a user's links. */
import type {LinkedAccounts,} from '../schema'

import css from './historybutton.module.css'

/** Props for {@link AccountTable}. */
interface AccountTableProps {
	/** Column heading, e.g. `account behind submitted links`. */
	heading: string
	accounts: LinkedAccounts
	/** When set, a `%` column is shown relative to this total and over-represented rows are highlighted. */
	total?: number
	/** Maps a share and raw count to a highlight class name. */
	ratioClassName?: (ratio: number, rawCount: number,) => string | undefined
	/** Formats a share for the `%` column. */
	asPercentage?: (ratio: number,) => string
}

/**
 * Renders linked accounts sorted by count. The account URL is shown as a tooltip because display names
 * (from oEmbed) can differ from the handle the link actually points at.
 */
export function AccountTable ({heading, accounts, total, ratioClassName, asPercentage,}: AccountTableProps,) {
	const showShare = total != null && total > 0
	return (
		<table className={css.table}>
			<thead>
				<tr>
					<th>{heading}</th>
					<th>provider</th>
					<th>count</th>
					{showShare && <th>%</th>}
				</tr>
			</thead>
			<tbody>
				{Object.entries(accounts,)
					.sort(([_, a,], [__, b,],) => b.count - a.count)
					.map(([key, account,],) => {
						const ratio = showShare ? account.count / total : 0
						return (
							<tr key={key} className={showShare ? ratioClassName?.(ratio, account.count,) : undefined}>
								<td>
									<a target="_blank" rel="noreferrer" href={account.url} title={account.url}>
										{account.name}
									</a>
								</td>
								<td>{account.provider}</td>
								<td>{account.count}</td>
								{showShare && <td>{asPercentage?.(ratio,)}</td>}
							</tr>
						)
					},)}
			</tbody>
		</table>
	)
}
