/**
 * Firefox-only background half of container support: routes the network call of a request that
 * originated in a Multi-Account Container tab back to that tab's frame, which performs it with
 * the container's cookies (see api/transport/containerExecutor).
 */

import browser from 'webextension-polyfill'

import {
	type ContainerMessage,
	deserializeResponse,
	type ForwardedRequestInit,
	isContainerReply,
} from '../../api/transport/forwardedRequest'
import {isFirefoxBuild,} from '../../util/infra/buildenv'

/** Firefox's default cookie store; background requests already use it, so it needs no forwarding. */
const defaultStoreId = 'firefox-default'

/** The frame a container request is forwarded to, and the cookie store it belongs to. */
export interface ContainerTarget {
	/** Tab that sent the request. */
	tabId: number
	/** Frame within that tab that sent the request (0 is the top frame). */
	frameId: number
	/** Cookie store (container) of the tab, used for background cookie lookups. */
	cookieStoreId: string
}

/**
 * Returns where to forward a request from `sender`, or `undefined` when the background can send
 * it itself: Chrome, no tab, or the default container. Derived only from the trusted `sender`.
 */
export function containerTargetFor (sender: browser.Runtime.MessageSender,): ContainerTarget | undefined {
	if (!isFirefoxBuild) {
		return undefined
	}
	const tab = sender.tab
	const cookieStoreId = tab?.cookieStoreId
	if (tab?.id === undefined || !cookieStoreId || cookieStoreId === defaultStoreId) {
		return undefined
	}
	return {tabId: tab.id, frameId: sender.frameId ?? 0, cookieStoreId,}
}

/** Sends `message` to the target frame and rebuilds the `Response` it replies with. */
async function forward (target: ContainerTarget, message: ContainerMessage,): Promise<Response> {
	const reply: unknown = await browser.tabs.sendMessage(target.tabId, message, {frameId: target.frameId,},)
	if (!isContainerReply(reply,)) {
		throw new Error('Container request: no valid reply from the originating tab',)
	}
	if (reply.error !== undefined) {
		throw new Error(`Container request failed: ${reply.error}`,)
	}
	return deserializeResponse(reply.response,)
}

/** Performs `url` with `init` from the target frame, so it carries the container's cookies. */
export function fetchInContainer (
	target: ContainerTarget,
	url: string,
	init: ForwardedRequestInit,
): Promise<Response> {
	return forward(target, {action: 'toolbox-container-fetch', url, init,},)
}

/** Requests an OAuth token from the target frame, as the page, using the container's CSRF token. */
export function requestTokenInContainer (target: ContainerTarget, csrfToken: string,): Promise<Response> {
	return forward(target, {action: 'toolbox-container-token', csrfToken,},)
}
