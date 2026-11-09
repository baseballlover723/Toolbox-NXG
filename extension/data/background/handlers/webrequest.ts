/**
 * Background handler that performs actual HTTP requests on behalf of content
 * scripts. All Reddit API traffic is proxied through here so that OAuth tokens,
 * rate-limit tracking, and SSRF guards are centralized in the service worker.
 */

import browser from 'webextension-polyfill'

import {
	type ForwardedBody,
	type ForwardedRequestInit,
	serializeResponse,
	toRequestInit,
} from '../../api/transport/forwardedRequest'
import {isFirefoxBuild,} from '../../util/infra/buildenv'
import createLogger from '../../util/infra/logging'
import {isAllowedRedditHost,} from '../../util/reddit/redditHost'
import {registerMessageHandler,} from '../messageHandling'
import type {TbRatelimitStatusResponse,} from '../messages'
import {type ContainerTarget, containerTargetFor, fetchInContainer, requestTokenInContainer,} from './containerRequest'
import {getCookieWithFPIFallback, getRedditSessionJTI,} from './tabUtils'

const log = createLogger('TBWebrequest',)

type QueryValue = string | number | boolean | undefined
type RequestBodyObject = Record<string, string | undefined>
type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'HEAD'

const allowedRequestMethods = new Set<RequestMethod>(['GET', 'POST', 'DELETE', 'HEAD',],)

interface RateLimitState {
	remaining: number
	resetAt: number // absolute ms timestamp
}

let rateLimitState: RateLimitState = {remaining: Infinity, resetAt: 0,}
let budgetWaitPromise: Promise<void> | null = null

/**
 * Resets rate-limit tracking to the initial "unlimited" state.
 * @internal Exported for use in tests only.
 */
export function resetRateLimitState (): void {
	rateLimitState = {remaining: Infinity, resetAt: 0,}
	budgetWaitPromise = null
}

/**
 * Returns a serializable snapshot of the shared rate-limit budget. `Infinity`
 * (no limit observed) does not survive the message channel, so it maps to `null`.
 */
export function getRateLimitStatus (): TbRatelimitStatusResponse {
	return {
		remaining: Number.isFinite(rateLimitState.remaining,) ? rateLimitState.remaining : null,
		resetAt: rateLimitState.resetAt,
	}
}

/** Updates the in-memory rate-limit state from Reddit's `x-ratelimit-*` response headers. */
function updateRateLimitState (response: Response,): void {
	const remaining = response.headers.get('x-ratelimit-remaining',)
	const reset = response.headers.get('x-ratelimit-reset',)
	if (remaining != null && reset != null) {
		rateLimitState = {
			remaining: parseFloat(remaining,),
			resetAt: Date.now() + parseFloat(reset,) * 1000,
		}
	}
}

/**
 * Atomically checks whether the rate-limit budget has a slot available and, if so,
 * decrements it. Returns `true` if a slot was consumed (caller may proceed), `false`
 * if the budget is exhausted.
 *
 * The read-modify-write is uninterruptible because it contains no `await` - JS's
 * single-threaded event loop guarantees no other handler runs between the check and
 * the decrement, closing the check-then-act race in `waitForBudget`.
 */
function consumeBudget (): boolean {
	if (rateLimitState.remaining < 1) { return false }
	rateLimitState = {...rateLimitState, remaining: rateLimitState.remaining - 1,}
	return true
}

/**
 * Waits until the Reddit API rate-limit budget has at least one call remaining, then
 * atomically consumes a slot via {@link consumeBudget}. All concurrent callers share
 * a single timer promise so only one reset delay is created.
 *
 * State mutations after the `await` happen in the same synchronous continuation so
 * that `rateLimitState` and `budgetWaitPromise` are always updated together - no
 * concurrent caller can observe one reset without the other.
 */
async function waitForBudget (): Promise<void> {
	if (consumeBudget()) { return }
	if (!budgetWaitPromise) {
		const ms = Math.max(0, rateLimitState.resetAt - Date.now(),)
		budgetWaitPromise = new Promise<void>((resolve,) => setTimeout(resolve, ms,))
	}
	await budgetWaitPromise
	// Both mutations happen in the same synchronous step; nothing else can
	// run between them, so no caller sees partial state.
	budgetWaitPromise = null
	if (!consumeBudget()) {
		// Timer expired but no response has updated remaining - optimistically reset,
		// then retry in case another concurrent waiter already consumed the fresh slot.
		rateLimitState = {remaining: Infinity, resetAt: 0,}
		return waitForBudget()
	}
}

/** Cached OAuth access token with its expiry timestamp. */
interface TokenData {
	/** The bearer token to include in `Authorization` headers. */
	accessToken: string
	/** Absolute millisecond timestamp after which the token should not be used. */
	expires: number
}

/**
 * Sends the CSRF-for-OAuth token exchange. Container requests go through the originating tab,
 * which must send it as the page: reddit refuses this endpoint from a content script's `fetch`.
 */
function sendTokenRequest (csrfToken: string, container: ContainerTarget | undefined,): Promise<Response> {
	// isFirefoxBuild lets Rollup drop the container path from the Chrome bundle.
	if (isFirefoxBuild && container) {
		return requestTokenInContainer(container, csrfToken,)
	}
	return fetch('https://www.reddit.com/svc/shreddit/token', {
		headers: {'Content-Type': 'application/json',},
		method: 'POST',
		body: JSON.stringify({csrf_token: csrfToken,},),
	},)
}

/**
 * Fetches an OAuth token from the /svc/shreddit/token endpoint.
 * @param container Firefox container tab the request came from, so the token is minted
 * from and cached against that container's session; `undefined` for the default session.
 * @param tries Number of tries to get the token (recursive)
 */
async function getOAuthTokens (container?: ContainerTarget, tries = 1,): Promise<TokenData> {
	// Attempt to use cached token if it hasn't expired

	// make currently-logged-in user part of the storage key so we don't
	// accidentally use the wrong access token after switching accounts (or
	// containers)
	const currentUserID = await getRedditSessionJTI(container?.cookieStoreId,)
	const storageKey = `toolbox-accessToken-${currentUserID}`
	// browser.storage.local.get returns { [key]: value } rather than the value directly
	const cachedToken = (await browser.storage.local.get(storageKey,))[storageKey] as TokenData | undefined
	if (cachedToken && cachedToken.expires > Date.now()) {
		return cachedToken
	}

	// No luck, fetch new token

	// Grab the csrf_token cookie from the originating container
	const csrfToken = await getCookieWithFPIFallback({
		url: 'https://sh.reddit.com',
		name: 'csrf_token',
		...(container ? {storeId: container.cookieStoreId,} : {}),
	},)

	// If we have a valid cookie, exchange CSRF token for OAuth token and return
	if (csrfToken) {
		const response = await sendTokenRequest(csrfToken.value, container,)
		const contentType = response.headers.get('content-type',)
		if (response.ok && contentType?.startsWith('application/json',)) {
			const tokenData = await response.json() as {token: string; expires: number}
			const result: TokenData = {
				accessToken: tokenData.token,
				expires: tokenData.expires,
			}
			await browser.storage.local.set({[storageKey]: result,},)
			return result
		} else {
			throw new Error(
				`Error getting accessToken from /svc/shreddit/token. Response text: ${await response.text()}`,
			)
		}
	}

	// If there's no CSRF token cookie yet, make a request to any shreddit page
	// to set the cookie, then try again
	if (tries < 3) {
		await makeRequest({
			endpoint: 'https://sh.reddit.com/not_found',
			absolute: true,
			container,
		},)
		return getOAuthTokens(container, tries + 1,)
	} else {
		throw new Error('error getting CSRF token',)
	}
}

/** Converts a request body to plain data; form fields with no value are dropped. */
function toForwardedBody (body: RequestBodyObject | string,): ForwardedBody {
	if (typeof body === 'string') {
		return {kind: 'text', text: body,}
	}
	const fields: Record<string, string> = {}
	for (const [key, value,] of Object.entries(body,)) {
		if (value != null) {
			fields[key] = value
		}
	}
	return {kind: 'form', fields,}
}

/** Uppercases `method` and validates it against the allowed set; returns `undefined` when `method` is `undefined`. */
function normalizeMethod (method: string | undefined,): RequestMethod | undefined {
	if (method === undefined) {
		return undefined
	}
	const normalizedMethod = method.toUpperCase()
	if (!allowedRequestMethods.has(normalizedMethod as RequestMethod,)) {
		throw new Error(`toolbox-request: unsupported HTTP method: ${method}`,)
	}
	return normalizedMethod as RequestMethod
}

/** Throws if any query parameter value is not a string, number, boolean, or undefined. */
function validateQueryParams (query: Record<string, QueryValue> | undefined,): void {
	if (!query) {
		return
	}
	for (const [key, value,] of Object.entries(query,)) {
		if (
			value !== undefined
			&& typeof value !== 'string'
			&& typeof value !== 'number'
			&& typeof value !== 'boolean'
		) {
			throw new Error(`toolbox-request: query parameter ${key} must be a scalar value`,)
		}
	}
}

/** Throws if a form-encoded body object contains any non-string values. */
function validateRequestBody (body: RequestBodyObject | string | {type: 'json'; data: unknown} | undefined,): void {
	if (body === undefined || typeof body === 'string') {
		return
	}
	if (typeof body === 'object' && 'type' in body && body.type === 'json') {
		return
	}
	for (const [key, value,] of Object.entries(body as RequestBodyObject,)) {
		if (value !== undefined && typeof value !== 'string') {
			throw new Error(`toolbox-request: body parameter ${key} must be a string`,)
		}
	}
}

/** Appends `query` parameters to `endpoint` using the `URL` API, returning the final URL string. */
function appendQueryToAbsoluteUrl (endpoint: string, query: Record<string, QueryValue> | undefined,): string {
	const url = new URL(endpoint,)
	if (query) {
		for (const [key, value,] of Object.entries(query,)) {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, String(value,),)
			}
		}
	}
	return url.toString()
}

/** Returns `'omit'` for redd.it media hosts (no cookies needed) and `'include'` for all other Reddit origins. */
function credentialsForUrl (url: string,): RequestCredentials {
	const {hostname,} = new URL(url,)
	return hostname === 'redd.it' || hostname.endsWith('.redd.it',) ? 'omit' : 'include'
}

/** How a request to oauth.reddit.com is authenticated. */
type OAuthMode = 'cookie' | 'bearer'

/** Returns `true` for methods that only read data and so may be retried under a different auth mode. */
function isReadMethod (method: RequestMethod | undefined,): boolean {
	return method === undefined || method === 'GET' || method === 'HEAD'
}

/**
 * Path prefixes of OAuth-native APIs that only recognize bearer tokens. Without one they do not
 * always fail: `/api/v1/me` answers 200 with the logged-out shape (no `name`), which the 403
 * fallback cannot catch, so these must never start in cookie mode.
 */
const bearerOnlyPrefixes = ['/api/mod/', '/api/v1/',]

/**
 * Path suffixes of subreddit-scoped OAuth-native APIs that only recognize bearer tokens. The flair
 * template lists answer a cookie-only request with 404, not 403, so the 403 fallback never fires.
 */
const bearerOnlySuffixes = ['/api/user_flair_v2', '/api/link_flair_v2',]

/**
 * Picks the auth mode to try first for a request on oauth.reddit.com.
 *
 * Reddit rejects bearer tokens on some classic read endpoints (e.g. `/api/info.json` returns 403
 * for any request carrying one), while the OAuth-native APIs in {@link bearerOnlyPrefixes} ignore
 * the session cookie. Mutations still accept bearer tokens. Reads therefore start with the session
 * cookie, except under those prefixes or {@link bearerOnlySuffixes}, and everything else keeps using
 * a bearer token.
 */
function initialOAuthMode (method: RequestMethod | undefined, endpoint: string,): OAuthMode {
	if (!isReadMethod(method,)) {
		return 'bearer'
	}
	const bearerOnly = bearerOnlyPrefixes.some((prefix,) => endpoint.startsWith(prefix,))
		|| bearerOnlySuffixes.some((suffix,) => endpoint.endsWith(suffix,))
	return bearerOnly ? 'bearer' : 'cookie'
}

/** Options accepted by {@link makeRequest}. */
export interface MakeRequestOptions {
	/** HTTP method; defaults to `GET`. */
	method?: string | undefined
	/** API endpoint path, or a fully-qualified URL when `absolute` is `true`. */
	endpoint: string
	/** Query parameters to append to the URL. */
	query?: Record<string, QueryValue> | undefined
	/** Request body; objects are form-encoded, strings are sent as-is, `{type:'json'}` is JSON-encoded. */
	body?: RequestBodyObject | string | {type: 'json'; data: unknown} | undefined
	/**
	 * If `true`, targets `oauth.reddit.com` and authenticates with either the session cookie or a
	 * bearer token depending on the endpoint; reads that get a 403 are retried once with the other.
	 */
	oauth?: boolean | undefined
	/** If `true`, throws for non-2xx responses. */
	okOnly?: boolean | undefined
	/** If `true`, treats `endpoint` as a fully-qualified URL. Must target a reddit.com origin. */
	absolute?: boolean | undefined
	/**
	 * Firefox container tab that originated the request; its frame performs the network
	 * call so the container's cookies are sent. Derived from the trusted message `sender`,
	 * never from content-script-supplied payload data.
	 */
	container?: ContainerTarget | undefined
}

/** An `Error` that may carry the failed `Response` for `okOnly` errors. */
interface RequestError extends Error {
	response?: Response
}

/** Throws a response-bearing error for non-2xx responses when `okOnly` is set; otherwise returns the response. */
function finish (response: Response, okOnly: boolean | undefined,): Response {
	if (okOnly && !response.ok) {
		const error: RequestError = new Error('Response returned non-2xx status code',)
		error.response = response
		throw error
	}
	return response
}

/**
 * Performs an arbitrary HTTP request on behalf of the extension.
 */
export async function makeRequest ({
	method,
	endpoint,
	query,
	body,
	oauth,
	okOnly,
	absolute,
	container,
}: MakeRequestOptions,): Promise<Response> {
	// Construct the request URL
	const normalizedMethod = normalizeMethod(method,)
	validateQueryParams(query,)
	validateRequestBody(body,)
	const base = absolute ? endpoint : `https://${oauth ? 'oauth' : 'old'}.reddit.com${endpoint}`
	const url = appendQueryToAbsoluteUrl(base, query,)

	// Guard: absolute URLs must target a Reddit HTTPS origin to prevent SSRF-style misuse.
	if (absolute) {
		const targetUrl = new URL(url,)
		const targetHost = targetUrl.hostname
		if (targetUrl.protocol !== 'https:' || !isAllowedRedditHost(targetHost,)) {
			throw new Error(`toolbox-request: absolute URL must target a reddit.com origin, got: ${targetHost}`,)
		}
		if (oauth) {
			throw new Error('toolbox-request: absolute OAuth requests are not allowed',)
		}
	}

	if (body && normalizedMethod !== 'POST') {
		throw new Error('toolbox-request: request bodies are only allowed with POST requests',)
	}

	// Construct the fetch options as plain data, so a container request can be forwarded as-is
	const fetchOptions: ForwardedRequestInit = {
		credentials: credentialsForUrl(url,), // required for reddit.com cookies, omitted for redd.it media hosts
		redirect: 'error', // prevents strange reddit API shenanigans
		...(normalizedMethod !== undefined ? {method: normalizedMethod,} : {}),
		cache: 'no-store',
	}
	if (body) {
		if (typeof body === 'object' && 'type' in body && body.type === 'json') {
			fetchOptions.body = {kind: 'text', text: JSON.stringify(body.data,),}
			fetchOptions.headers = {...fetchOptions.headers, 'Content-Type': 'application/json',}
		} else {
			fetchOptions.body = toForwardedBody(body as RequestBodyObject | string,)
		}
	}

	/** Returns the fetch options for `mode`; cookie mode relies on `credentials: 'include'` alone. */
	async function optionsForMode (mode: OAuthMode,): Promise<ForwardedRequestInit> {
		if (mode === 'cookie') {
			return fetchOptions
		}
		try {
			const tokens = await getOAuthTokens(container,)
			return {
				...fetchOptions,
				headers: {...fetchOptions.headers, Authorization: `Bearer ${tokens.accessToken}`,},
			}
		} catch (error) {
			log.error('getOAuthTokens: ', error,)
			throw error
		}
	}

	/**
	 * Sends the request: from the originating container tab if there is one, else from here.
	 * Kept out of `performFetch`'s `try` block: Rollup keeps everything referenced inside a `try`,
	 * so the branch must live here for the Chrome bundle to drop the container path.
	 */
	function send (options: ForwardedRequestInit,): Promise<Response> {
		if (isFirefoxBuild && container) {
			return fetchInContainer(container, url, options,)
		}
		return fetch(url, toRequestInit(options,),)
	}

	/** Sends the request, logging and rethrowing network failures. */
	async function performFetch (options: ForwardedRequestInit, failureMessage: string,): Promise<Response> {
		try {
			return await send(options,)
		} catch (error) {
			log.error(failureMessage, error,)
			throw error
		}
	}

	/** Sends the request, waiting first if the rate-limit budget is exhausted and retrying once on 429. */
	async function sendWithBudget (options: ForwardedRequestInit,): Promise<Response> {
		await waitForBudget()
		let result = await performFetch(options, 'Fetch request failed:',)
		updateRateLimitState(result,)

		// updateRateLimitState above already recorded remaining=0 and resetAt from the
		// response headers (if present). If the 429 carried no rate-limit headers, set
		// a 1-second minimum so waitForBudget always delays before the retry.
		if (result.status === 429) {
			if (rateLimitState.remaining >= 1) {
				rateLimitState = {remaining: 0, resetAt: Date.now() + 1000,}
			}
			await waitForBudget()
			result = await performFetch(options, 'Fetch request failed on retry:',)
			updateRateLimitState(result,)
		}
		return result
	}

	if (!oauth) {
		return finish(await sendWithBudget(fetchOptions,), okOnly,)
	}

	const mode = initialOAuthMode(normalizedMethod, endpoint,)
	let response = await sendWithBudget(await optionsForMode(mode,),)

	// Reddit moves endpoints between cookie-only and bearer-only without notice, so a
	// read that is refused under one mode is retried once under the other. Mutations
	// are never retried, to avoid performing an action twice.
	if (response.status === 403 && isReadMethod(normalizedMethod,)) {
		const fallbackMode: OAuthMode = mode === 'cookie' ? 'bearer' : 'cookie'
		let fallbackOptions: ForwardedRequestInit | undefined
		try {
			fallbackOptions = await optionsForMode(fallbackMode,)
		} catch {
			// Token minting failed; already logged. Report the original 403.
		}
		if (fallbackOptions) {
			response = await sendWithBudget(fallbackOptions,)
		}
	}

	return finish(response, okOnly,)
}

/**
 * Registers the `toolbox-request` message handler that proxies fetch calls, and the
 * `toolbox-ratelimit-status` handler that reports the shared budget.
 */
export function registerWebrequestHandlers () {
	registerMessageHandler('toolbox-request', (request, sender,) =>
		// container comes only from the trusted sender and is assigned after the
		// request fields so a spoofed payload value cannot override it.
		makeRequest({...request, container: containerTargetFor(sender,),},).then(
			async (response,) => ({response: await serializeResponse(response,),}),
			async (error: RequestError,) => ({
				error: true as const,
				message: error.message,
				response: error.response ? await serializeResponse(error.response,) : undefined,
			}),
		),)
	registerMessageHandler('toolbox-ratelimit-status', () => getRateLimitStatus(),)
}
