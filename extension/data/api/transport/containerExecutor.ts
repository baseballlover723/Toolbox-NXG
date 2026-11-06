/**
 * Firefox-only content-side half of container support: performs requests the background
 * forwards to this frame, so they carry the cookies of the tab's Multi-Account Container.
 *
 * A background `fetch()` always sends the default container's cookies and Firefox has no API to
 * pick another store (bug 1670278). A content script's own `fetch()` uses its tab's container, so
 * the background keeps all request logic (auth mode, rate limiting, SSRF checks) and only hands
 * the network call to the originating frame.
 */

import browser from 'webextension-polyfill'

import {isFirefoxBuild,} from '../../util/infra/buildenv'
import {isAllowedRedditHost,} from '../../util/reddit/redditHost'
import {
	type ContainerFetchMessage,
	type ContainerReply,
	type ContainerTokenMessage,
	isContainerFetchMessage,
	isContainerTokenMessage,
	serializeResponse,
	toRequestInit,
} from './forwardedRequest'

let registered = false

/** Returns `true` if `url` is an HTTPS URL on a reddit.com or redd.it host. */
function isRedditHttpsUrl (url: string,): boolean {
	try {
		const parsed = new URL(url,)
		return parsed.protocol === 'https:' && isAllowedRedditHost(parsed.hostname,)
	} catch {
		return false
	}
}

/** Returns a message for `error`, which may be any thrown value. */
function describeError (error: unknown,): string {
	return error instanceof Error ? error.message : String(error,)
}

/**
 * Returns the page's own `fetch`, bound to the page window, or `undefined` if unavailable.
 *
 * Firefox exposes the page window to content scripts as `content`. Its `fetch` sends the request
 * as the page (page `Origin`), which reddit's token endpoint requires. The Xray wrapper yields the
 * native function, so a page script that replaces `window.fetch` cannot intercept the call.
 */
function getPageFetch (): ((input: string, init: RequestInit,) => Promise<Response>) | undefined {
	const page: unknown = Reflect.get(globalThis, 'content',)
	if (typeof page !== 'object' || page === null) {
		return undefined
	}
	const pageFetch: unknown = Reflect.get(page, 'fetch',)
	if (typeof pageFetch !== 'function') {
		return undefined
	}
	return (input, init,) => Reflect.apply(pageFetch, page, [input, init,],)
}

/** Performs a forwarded request with this content script's `fetch` and serializes the result. */
async function runFetch (message: ContainerFetchMessage,): Promise<ContainerReply> {
	if (!isRedditHttpsUrl(message.url,)) {
		return {error: 'container request: URL must be an HTTPS reddit origin',}
	}
	try {
		const response = await fetch(message.url, toRequestInit(message.init,),)
		return {response: await serializeResponse(response,),}
	} catch (error) {
		return {error: describeError(error,),}
	}
}

/**
 * Exchanges the container's CSRF token for an OAuth token via the page's `fetch`, against this
 * frame's own host so the request is same-origin (a cross-origin page request is refused by CORS).
 */
async function runTokenRequest (message: ContainerTokenMessage,): Promise<ContainerReply> {
	if (!isAllowedRedditHost(location.hostname,)) {
		return {error: 'container token request: frame is not on a reddit host',}
	}
	const pageFetch = getPageFetch()
	if (!pageFetch) {
		return {error: 'container token request: page fetch is unavailable',}
	}
	try {
		const response = await pageFetch(`${location.origin}/svc/shreddit/token`, {
			method: 'POST',
			credentials: 'include',
			cache: 'no-store',
			headers: {'Content-Type': 'application/json',},
			body: JSON.stringify({csrf_token: message.csrfToken,},),
		},)
		// The response object belongs to the page; read only plain values through the Xray wrapper
		// rather than iterating its headers, and keep the one header the background inspects.
		const contentType = response.headers.get('content-type',)
		return {
			response: [await response.text(), {
				status: response.status,
				statusText: response.statusText,
				headers: contentType !== null ? {'content-type': contentType,} : {},
			},],
		}
	} catch (error) {
		return {error: describeError(error,),}
	}
}

/**
 * Starts answering container request messages from the background. Firefox bundle only; a no-op
 * in Chrome, which has no containers. Uses its own listener that returns the reply, instead of
 * the window CustomEvent bridge, so request and response data never reach page scripts.
 */
export function registerContainerRequestExecutor (): void {
	if (!isFirefoxBuild || registered) {
		return
	}
	registered = true
	browser.runtime.onMessage.addListener((message: unknown,) => {
		if (isContainerFetchMessage(message,)) {
			return runFetch(message,)
		}
		if (isContainerTokenMessage(message,)) {
			return runTokenRequest(message,)
		}
		return undefined
	},)
}
