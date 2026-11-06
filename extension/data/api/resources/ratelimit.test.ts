/** Tests for the API budget status helpers. */

import {beforeEach, describe, expect, it, vi,} from 'vitest'

const sendMessage = vi.hoisted(() => vi.fn())

vi.mock('webextension-polyfill', () => ({default: {runtime: {sendMessage,},},}),)

import {formatApiBudgetReset, getApiBudgetStatus, isApiBudgetExhausted,} from './ratelimit'

beforeEach(() => {
	sendMessage.mockReset()
},)

describe('getApiBudgetStatus', () => {
	it('asks the background and returns its snapshot', async () => {
		sendMessage.mockResolvedValue({remaining: 12, resetAt: 5000,},)
		await expect(getApiBudgetStatus(),).resolves.toEqual({remaining: 12, resetAt: 5000,},)
		expect(sendMessage,).toHaveBeenCalledWith({action: 'toolbox-ratelimit-status',},)
	})

	it('accepts a null remaining count', async () => {
		sendMessage.mockResolvedValue({remaining: null, resetAt: 0,},)
		await expect(getApiBudgetStatus(),).resolves.toEqual({remaining: null, resetAt: 0,},)
	})

	it('returns null for a malformed reply', async () => {
		sendMessage.mockResolvedValue(undefined,)
		await expect(getApiBudgetStatus(),).resolves.toBeNull()
	})

	it('returns null when the background is unreachable', async () => {
		sendMessage.mockRejectedValue(new Error('no receiver',),)
		await expect(getApiBudgetStatus(),).resolves.toBeNull()
	})
})

describe('isApiBudgetExhausted', () => {
	it('is true when no calls remain and the reset is ahead', () => {
		expect(isApiBudgetExhausted({remaining: 0, resetAt: 2000,}, 1000,),).toBe(true,)
	})

	it('is false once the reset time has passed', () => {
		expect(isApiBudgetExhausted({remaining: 0, resetAt: 1000,}, 2000,),).toBe(false,)
	})

	it('is false while calls remain or no limit is known', () => {
		expect(isApiBudgetExhausted({remaining: 3, resetAt: 2000,}, 1000,),).toBe(false,)
		expect(isApiBudgetExhausted({remaining: null, resetAt: 0,}, 1000,),).toBe(false,)
	})
})

describe('formatApiBudgetReset', () => {
	it('formats the remaining time as m:ss, rounding up', () => {
		expect(formatApiBudgetReset({remaining: 0, resetAt: 401_500,}, 1000,),).toBe('6:41',)
		expect(formatApiBudgetReset({remaining: 0, resetAt: 6000,}, 1000,),).toBe('0:05',)
	})

	it('returns null when the reset is unknown or past', () => {
		expect(formatApiBudgetReset({remaining: null, resetAt: 0,}, 1000,),).toBeNull()
		expect(formatApiBudgetReset({remaining: 0, resetAt: 500,}, 1000,),).toBeNull()
	})
})
