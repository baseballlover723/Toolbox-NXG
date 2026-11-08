/** Module settings definitions for the Proposals module. */

import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings(
	[
		{
			id: 'hideModbarIconWhenEmpty',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Hide the modbar Proposals icon while there is nothing to review',
		},
		{
			id: 'showSecondOpinion',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Show the "Second opinion" toggle on posts and comments',
		},
	] as const,
)

/** Inferred settings type for the Proposals module. */
export type ProposalsSettings = InferSettings<typeof settings>
