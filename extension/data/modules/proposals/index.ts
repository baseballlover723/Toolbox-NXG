/**
 * Entry point for the Proposals module (training mode / second opinions). Mounts
 * the modbar review button, training indicator, inline badge, and second-opinion
 * toggle. The capture runtime (gateway providers, guard predicate) is wired separately in `init.ts` via `initProposalsRuntime` so it is
 * always active regardless of this module's enabled state - a trainee must never
 * be able to disable their own sandbox by turning a module off.
 */

import {createLifecycle,} from '../../framework/lifecycle'
import {Module,} from '../../framework/module'
import {proposals,} from '../../framework/moduleIds'
import {isEmbedded,} from '../../util/infra/platform'
import {
	createProposalsInlineBadgeSlot,
	createProposalsModbarSlot,
	createProposalsSecondOpinionSlot,
	createTrainingModeIndicatorSlot,
} from './dom'
import {type ProposalsSettings, settings,} from './settings'

export default new Module<ProposalsSettings>({
	name: 'Proposals',
	id: proposals,
	docSlug: 'proposals',
	// Proposals only work with the whole team on board, so mods can't switch the module off;
	// its settings only trim how much of it shows.
	alwaysEnabled: true,
	settings,
}, ({hideModbarIconWhenEmpty, showSecondOpinion,},) => {
	if (isEmbedded) {
		return
	}
	const lifecycle = createLifecycle()
	lifecycle.mount(createProposalsModbarSlot(hideModbarIconWhenEmpty,),)
	lifecycle.mount(createTrainingModeIndicatorSlot(),)
	lifecycle.mount(createProposalsInlineBadgeSlot(),)
	if (showSecondOpinion) { lifecycle.mount(createProposalsSecondOpinionSlot(),) }
	return lifecycle.cleanup
},)
