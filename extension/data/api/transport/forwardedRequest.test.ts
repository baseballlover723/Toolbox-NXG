/** Tests for the plain-data request/response format used for container request forwarding. */

import {describe, expect, it,} from 'vitest'

import {
	deserializeResponse,
	isContainerFetchMessage,
	isContainerReply,
	isContainerTokenMessage,
	serializeResponse,
	toRequestInit,
} from './forwardedRequest'

describe('toRequestInit', () => {
	it('rebuilds form bodies as FormData', () => {
		const init = toRequestInit({
			method: 'POST',
			credentials: 'include',
			redirect: 'error',
			cache: 'no-store',
			body: {kind: 'form', fields: {id: 't3_abc',},},
		},)

		expect(init,).toEqual(expect.objectContaining({
			method: 'POST',
			credentials: 'include',
			redirect: 'error',
			cache: 'no-store',
		},),)
		expect(init.body,).toBeInstanceOf(FormData,)
		expect((init.body as FormData).get('id',),).toBe('t3_abc',)
	})

	it('passes text bodies and headers through, and omits absent fields', () => {
		const init = toRequestInit({
			credentials: 'omit',
			redirect: 'error',
			cache: 'no-store',
			headers: {'Content-Type': 'application/json',},
			body: {kind: 'text', text: '{"a":1}',},
		},)

		expect(init,).toEqual({
			credentials: 'omit',
			redirect: 'error',
			cache: 'no-store',
			headers: {'Content-Type': 'application/json',},
			body: '{"a":1}',
		},)
		expect('method' in init,).toBe(false,)
	})
})

describe('response serialization', () => {
	it('round-trips status, headers, and body', async () => {
		const serialized = await serializeResponse(
			new Response('hello', {status: 201, statusText: 'Created', headers: {'x-ratelimit-remaining': '5',},},),
		)
		const response = deserializeResponse(serialized,)

		expect(response.status,).toBe(201,)
		expect(response.statusText,).toBe('Created',)
		expect(response.headers.get('x-ratelimit-remaining',),).toBe('5',)
		expect(await response.text(),).toBe('hello',)
	})

	it('rebuilds null-body statuses without a body', () => {
		expect(() => deserializeResponse(['', {status: 204,},],)).not.toThrow()
		expect(deserializeResponse(['', {status: 204,},],).status,).toBe(204,)
	})
})

describe('message guards', () => {
	const init = {credentials: 'include', redirect: 'error', cache: 'no-store',}

	it('accepts well-formed container messages', () => {
		expect(isContainerFetchMessage({action: 'toolbox-container-fetch', url: 'https://old.reddit.com/', init,},),)
			.toBe(true,)
		expect(isContainerTokenMessage({action: 'toolbox-container-token', csrfToken: 'abc',},),).toBe(true,)
	})

	it('rejects malformed container messages', () => {
		expect(isContainerFetchMessage({action: 'toolbox-container-fetch', url: 'https://old.reddit.com/',},),).toBe(
			false,
		)
		expect(
			isContainerFetchMessage({
				action: 'toolbox-container-fetch',
				url: 'https://old.reddit.com/',
				init: {...init, body: {kind: 'form', fields: {id: 1,},},},
			},),
		).toBe(false,)
		expect(isContainerTokenMessage({action: 'toolbox-container-token',},),).toBe(false,)
		expect(isContainerFetchMessage({action: 'toolbox-request', url: 'x', init,},),).toBe(false,)
	})

	it('recognizes replies', () => {
		expect(isContainerReply({error: 'nope',},),).toBe(true,)
		expect(isContainerReply({response: ['body', {status: 200,},],},),).toBe(true,)
		expect(isContainerReply(undefined,),).toBe(false,)
		expect(isContainerReply({response: ['body',],},),).toBe(false,)
	})
})
