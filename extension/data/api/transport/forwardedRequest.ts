/** Plain-data fetch requests and responses that cross the background <-> content-script message channel. */

import type {SerializedResponse,} from '../../background/messages'

/** A request body reduced to plain data; `FormData` cannot be sent through extension messaging. */
export type ForwardedBody =
	| {kind: 'form'; fields: Record<string, string>}
	| {kind: 'text'; text: string}

/** A `RequestInit` reduced to plain data so it can be sent to a content script and rebuilt there. */
export interface ForwardedRequestInit {
	/** HTTP method; `fetch` defaults to `GET` when omitted. */
	method?: string
	/** Request headers as a flat name/value map. */
	headers?: Record<string, string>
	/** Request body, rebuilt into `FormData` or a string by {@link toRequestInit}. */
	body?: ForwardedBody
	/** Cookie policy for the request. */
	credentials: RequestCredentials
	/** Redirect policy for the request. */
	redirect: RequestRedirect
	/** HTTP cache policy for the request. */
	cache: RequestCache
}

/**
 * Asks a Firefox container tab to perform a fetch with its own `fetch`, so the request carries
 * that container's cookies.
 */
export interface ContainerFetchMessage {
	action: 'toolbox-container-fetch'
	/** Absolute reddit URL to request. */
	url: string
	/** Request options to rebuild with {@link toRequestInit}. */
	init: ForwardedRequestInit
}

/**
 * Asks a Firefox container tab to exchange a CSRF token for an OAuth token as the page itself,
 * because reddit's token endpoint refuses content-script requests.
 */
export interface ContainerTokenMessage {
	action: 'toolbox-container-token'
	/** The container's `csrf_token` cookie value. */
	csrfToken: string
}

/** Any message handled by the content-side container request executor. */
export type ContainerMessage = ContainerFetchMessage | ContainerTokenMessage

/** A container executor's reply: the serialized response, or why the request could not be sent. */
export type ContainerReply =
	| {response: SerializedResponse; error?: never}
	| {error: string; response?: never}

/** HTTP statuses whose `Response` must be constructed with a `null` body. */
const nullBodyStatuses = new Set([204, 205, 304,],)

/** Returns `true` if `value` is a non-null, non-array object. */
function isPlainObject (value: unknown,): value is Record<string, unknown> {
	return value != null && typeof value === 'object' && !Array.isArray(value,)
}

/** Returns `true` if every value of `record` is a string. */
function isStringRecord (value: unknown,): value is Record<string, string> {
	return isPlainObject(value,) && Object.values(value,).every((item,) => typeof item === 'string')
}

/** Returns `true` if `value` is a well-formed {@link ForwardedBody}. */
function isForwardedBody (value: unknown,): value is ForwardedBody {
	if (!isPlainObject(value,)) {
		return false
	}
	return (value.kind === 'form' && isStringRecord(value.fields,))
		|| (value.kind === 'text' && typeof value.text === 'string')
}

/** Returns `true` if `value` is a well-formed {@link ForwardedRequestInit}. */
export function isForwardedRequestInit (value: unknown,): value is ForwardedRequestInit {
	return isPlainObject(value,)
		&& (value.method === undefined || typeof value.method === 'string')
		&& (value.headers === undefined || isStringRecord(value.headers,))
		&& (value.body === undefined || isForwardedBody(value.body,))
		&& typeof value.credentials === 'string'
		&& typeof value.redirect === 'string'
		&& typeof value.cache === 'string'
}

/** Returns `true` if `value` is a well-formed {@link ContainerFetchMessage}. */
export function isContainerFetchMessage (value: unknown,): value is ContainerFetchMessage {
	return isPlainObject(value,)
		&& value.action === 'toolbox-container-fetch'
		&& typeof value.url === 'string'
		&& isForwardedRequestInit(value.init,)
}

/** Returns `true` if `value` is a well-formed {@link ContainerTokenMessage}. */
export function isContainerTokenMessage (value: unknown,): value is ContainerTokenMessage {
	return isPlainObject(value,)
		&& value.action === 'toolbox-container-token'
		&& typeof value.csrfToken === 'string'
}

/** Returns `true` if `value` is a well-formed {@link ContainerReply}. */
export function isContainerReply (value: unknown,): value is ContainerReply {
	if (!isPlainObject(value,)) {
		return false
	}
	if (typeof value.error === 'string') {
		return true
	}
	const response = value.response
	return Array.isArray(response,)
		&& response.length === 2
		&& typeof response[0] === 'string'
		&& isPlainObject(response[1],)
}

/** Builds a `FormData` from string fields. */
function toFormData (fields: Record<string, string>,): FormData {
	const formData = new FormData()
	for (const [key, value,] of Object.entries(fields,)) {
		formData.append(key, value,)
	}
	return formData
}

/** Rebuilds a real `RequestInit` from its plain-data form. */
export function toRequestInit (init: ForwardedRequestInit,): RequestInit {
	const {body, headers, method, ...policies} = init
	return {
		...policies,
		...(method !== undefined ? {method,} : {}),
		...(headers !== undefined ? {headers,} : {}),
		...(body !== undefined ? {body: body.kind === 'form' ? toFormData(body.fields,) : body.text,} : {}),
	}
}

/**
 * Flattens a fetch `Response` into a plain JSON value from which an equivalent
 * `Response` can later be rebuilt with {@link deserializeResponse}.
 */
export async function serializeResponse (response: Response,): Promise<SerializedResponse> {
	const headers: Record<string, string> = {}
	for (const [header, value,] of response.headers) {
		headers[header] = value
	}
	return [await response.text(), {
		status: response.status,
		statusText: response.statusText,
		headers,
	},]
}

/** Rebuilds a `Response` from {@link serializeResponse} output, dropping the body for null-body statuses. */
export function deserializeResponse ([body, init,]: SerializedResponse,): Response {
	return new Response(nullBodyStatuses.has(init.status ?? 200,) ? null : body, init,)
}
