/** Module settings definitions for the Usernotes module. */

import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings(
	[
		{
			id: 'unManagerLink',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Show the Toolbox Usernotes Manager in modbox',
		},
		{
			id: 'closePopupAfterNoteSave',
			type: 'boolean',
			default: true,
			description: 'Close the usernotes popup after saving a new Toolbox note',
		},
		{
			id: 'requireNoteType',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Require a note type before saving a usernote',
		},
		{
			id: 'requireNoteText',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: true,
			description: 'Require note text before saving a usernote',
		},
		{
			id: 'requireNoteLink',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Require a link to the content before saving a usernote',
		},
		{
			id: 'showDate',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Show date in note preview',
		},
		{
			id: 'showOnModPages',
			sharedPolicy: 'raw',
			type: 'boolean',
			default: false,
			description: 'Show current usernote on ban/contrib/mod pages',
		},
		{
			id: 'maxChars',
			sharedPolicy: 'raw',
			type: 'number',
			default: 20,
			advanced: true,
			description: 'Max characters to display in current note tag (excluding date)',
		},
	] as const,
)

/** Inferred settings type for the Usernotes module. */
export type UserNotesSettings = InferSettings<typeof settings>
