/** Tests for the content-side container request executor. */

import {afterEach, beforeAll, beforeEach, describe, expect, it, vi,} from 'vitest'

const addListener = vi.hoisted(() => vi.fn())

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {onMessage: {addListener,},},},
}),)

import {registerContainerRequestExecutor,} from './containerExecutor'

/** The runtime.onMessage listener the executor registered. */
let listener: (message: unknown,) => Promise<unknown> | undefined

const init = {credentials: 'include', redirect: 'error', cache: 'no-store',} as const

beforeAll(() => {
	registerContainerRequestExecutor()
	listener = addListener.mock.calls[0]![0]
},)

beforeEach(() => {
	vi.stubGlobal('location', new URL('https://old.reddit.com/r/test/',),)
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(new Response('own', {status: 200, headers: {'x-ratelimit-remaining': '9',},},),),
	)
},)

afterEach(() => {
	vi.unstubAllGlobals()
},)

describe('registerContainerRequestExecutor', () => {
	it('registers a single listener', () => {
		registerContainerRequestExecutor()
		expect(addListener,).toHaveBeenCalledOnce()
	})

	it('ignores messages it does not own', () => {
		expect(listener({action: 'toolbox-global',},),).toBeUndefined()
		expect(listener({action: 'toolbox-container-fetch', url: 'https://old.reddit.com/',},),).toBeUndefined()
	})

	it('performs forwarded requests with the content script fetch and serializes the response', async () => {
		const reply = await listener({
			action: 'toolbox-container-fetch',
			url: 'https://oauth.reddit.com/api/save',
			init: {...init, method: 'POST', body: {kind: 'form', fields: {id: 't3_abc',},},},
		},)

		expect(fetch,).toHaveBeenCalledWith(
			'https://oauth.reddit.com/api/save',
			expect.objectContaining({
				method: 'POST',
				credentials: 'include',
				body: expect.any(FormData,),
			},),
		)
		expect(reply,).toEqual({
			response: [
				'own',
				expect.objectContaining({
					status: 200,
					headers: expect.objectContaining({'x-ratelimit-remaining': '9',},),
				},),
			],
		},)
	})

	it('refuses forwarded requests to non-reddit or non-HTTPS URLs', async () => {
		expect(await listener({action: 'toolbox-container-fetch', url: 'https://evil.example/', init,},),).toEqual({
			error: 'container request: URL must be an HTTPS reddit origin',
		},)
		expect(await listener({action: 'toolbox-container-fetch', url: 'http://old.reddit.com/', init,},),).toEqual({
			error: 'container request: URL must be an HTTPS reddit origin',
		},)
		expect(fetch,).not.toHaveBeenCalled()
	})

	it('reports fetch failures as errors', async () => {
		vi.mocked(fetch,).mockRejectedValueOnce(new TypeError('NetworkError',),)

		expect(await listener({action: 'toolbox-container-fetch', url: 'https://old.reddit.com/x', init,},),).toEqual({
			error: 'NetworkError',
		},)
	})

	it('mints tokens with the page fetch against the frame\'s own host', async () => {
		const pageFetch = vi.fn().mockResolvedValue(
			new Response('{"token":"t"}', {status: 200, headers: {'content-type': 'application/json',},},),
		)
		vi.stubGlobal('content', {fetch: pageFetch,},)

		const reply = await listener({action: 'toolbox-container-token', csrfToken: 'csrf',},)

		expect(pageFetch,).toHaveBeenCalledWith(
			'https://old.reddit.com/svc/shreddit/token',
			expect.objectContaining({
				method: 'POST',
				credentials: 'include',
				body: JSON.stringify({csrf_token: 'csrf',},),
			},),
		)
		expect(fetch,).not.toHaveBeenCalled()
		expect(reply,).toEqual({
			response: ['{"token":"t"}', {
				status: 200,
				statusText: '',
				headers: {'content-type': 'application/json',},
			},],
		},)
	})

	it('reports a missing page fetch instead of falling back to the content script fetch', async () => {
		vi.stubGlobal('content', undefined,)

		expect(await listener({action: 'toolbox-container-token', csrfToken: 'csrf',},),).toEqual({
			error: 'container token request: page fetch is unavailable',
		},)
		expect(fetch,).not.toHaveBeenCalled()
	})
})
