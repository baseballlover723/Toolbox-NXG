/** Settings definitions and inferred type for the Old Reddit module (currently no user-facing settings). */

import {defineSettings, type InferSettings,} from '../../framework/module'

export const settings = defineSettings([] as const,)

/** Inferred settings type for the Old Reddit module. */
export type OldRedditSettings = InferSettings<typeof settings>
