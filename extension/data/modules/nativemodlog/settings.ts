/** Module settings definitions for the Native Mod Log module. */

import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings(
	[
		{
			id: 'defaultTabName',
			sharedPolicy: 'raw',
			description: 'Default tab for the native mod log popup',
			type: 'selector',
			values: ['All Activity', 'Notes', 'Mod Actions',] as const,
			default: 'all_activity',
		},
		{
			id: 'defaultNoteLabel',
			sharedPolicy: 'raw',
			description: 'Default label for new native notes',
			type: 'selector',
			values: [
				'None',
				'Bot Ban',
				'Permaban',
				'Ban',
				'Abuse Warning',
				'Spam Warning',
				'Spam Watch',
				'Solid Contributor',
				'Helpful User',
			] as const,
			default: 'none',
		},
		{
			id: 'showAiSummaries',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Show Reddit\'s AI-generated user summaries on the NN tag and in the mod log',
		},
		{
			id: 'showModActions',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description:
				'Show mod actions (removals, bans, approvals, ...) alongside notes on the NN tag and in the mod log',
		},
		{
			id: 'maxChars',
			sharedPolicy: 'raw',
			type: 'number',
			default: 20,
			advanced: true,
			description: 'Max characters of the latest note to display in the NN tag',
		},
	] as const,
)

/** Inferred settings type for the Native Mod Log module. */
export type NativeModLogSettings = InferSettings<typeof settings>
