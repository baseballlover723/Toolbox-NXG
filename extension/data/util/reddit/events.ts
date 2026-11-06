/** Utilities for dispatching and listening to Toolbox CustomEvents on the window. */

import browser from 'webextension-polyfill'

import {isFirefoxBuild,} from '../infra/buildenv'
import createLogger from '../infra/logging'

const log = createLogger('TBPageContext',)

/** Dispatches a CustomEvent with the given name (and optional `detail` payload) on the window. */
export function sendEvent (tbuEvent: string, detail?: unknown,) {
	log.debug('Sending event:', tbuEvent,)
	window.dispatchEvent(new CustomEvent(tbuEvent, {detail,},),)
}

/**
 * Bridges incoming background messages to window CustomEvents so that modules
 * can use window.addEventListener for cross-tab events (e.g. TB_UPDATE_COUNTERS)
 * and navigation signals (e.g. toolbox-url-changed) without knowing about the
 * browser messaging layer. Each message's `action` becomes the event type and
 * its `payload` (if any) becomes `event.detail`.
 */
let bridgeActive = false

/** Background message actions handled by a dedicated listener and never bridged to the window. */
const privateActions = new Set<string>(isFirefoxBuild ? ['toolbox-container-fetch', 'toolbox-container-token',] : [],)

export function setupMessageBridge () {
	if (bridgeActive) {
		return
	}
	bridgeActive = true
	browser.runtime.onMessage.addListener((message: unknown,) => {
		if (
			message == null
			|| typeof message !== 'object'
			|| !('action' in message)
			|| typeof message.action !== 'string'
		) {
			return undefined
		}
		const {action, payload,} = message as {action: string; payload?: unknown}
		// Container request messages are answered by api/transport/containerExecutor and must not
		// surface as window events, which page scripts can observe.
		if (privateActions.has(action,)) {
			return undefined
		}
		window.dispatchEvent(new CustomEvent(action, {detail: payload,},),)
		return undefined
	},)
}

/** Well-known Toolbox event names dispatched on the window. */
export const events = {
	TB_APPROVE_THING: 'TB_APPROVE_THING',
	TB_PROPOSALS_CHANGED: 'TB_PROPOSALS_CHANGED',
	TB_SAMPLE_SOUND: 'TB_SAMPLE_SOUND',
	TB_SYNTAX_SETTINGS: 'TB_SYNTAX_SETTINGS',
	TB_THING_REMOVED: 'TB_THING_REMOVED',
	TB_UPDATE_COUNTERS: 'TB_UPDATE_COUNTERS',
}
