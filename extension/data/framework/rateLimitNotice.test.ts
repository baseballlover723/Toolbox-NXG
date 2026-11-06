/** Tests for the startup rate-limit notice. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const getApiBudgetStatus = vi.hoisted(() => vi.fn())

vi.mock('webextension-polyfill', () => ({default: {runtime: {sendMessage: vi.fn(),},},}),)
vi.mock('../api/resources/ratelimit', async (importOriginal,) => ({
	...await importOriginal<typeof import('../api/resources/ratelimit')>(),
	getApiBudgetStatus,
}),)

import {createRateLimitNotice, rateLimitNoticeText,} from './rateLimitNotice'

const findNotice = () => document.querySelector('.toolbox-ratelimit-notice',)

beforeEach(() => {
	vi.useFakeTimers({now: 1_000_000,},)
	getApiBudgetStatus.mockReset()
},)

afterEach(() => {
	vi.useRealTimers()
	document.body.innerHTML = ''
},)

describe('rateLimitNoticeText', () => {
	it('includes the countdown when known', () => {
		expect(rateLimitNoticeText('6:40',),).toContain('in 6:40',)
	})

	it('falls back to a generic wait when the reset is unknown', () => {
		expect(rateLimitNoticeText(null,),).toContain('shortly',)
	})
})

describe('createRateLimitNotice', () => {
	it('shows nothing while the budget has calls left', async () => {
		getApiBudgetStatus.mockResolvedValue({remaining: 50, resetAt: 1_400_000,},)
		const stop = createRateLimitNotice()
		await vi.advanceTimersByTimeAsync(0,)
		expect(findNotice(),).toBeNull()
		await stop()
	})

	it('shows a countdown while the budget is spent and removes it on cleanup', async () => {
		getApiBudgetStatus.mockResolvedValue({remaining: 0, resetAt: 1_400_000,},)
		const stop = createRateLimitNotice()
		await vi.advanceTimersByTimeAsync(0,)
		expect(findNotice()?.textContent,).toContain('6:40',)

		await vi.advanceTimersByTimeAsync(1000,)
		expect(findNotice()?.textContent,).toContain('6:39',)

		await stop()
		expect(findNotice(),).toBeNull()
	})

	it('appears when the budget runs out after startup began', async () => {
		getApiBudgetStatus.mockResolvedValueOnce({remaining: null, resetAt: 0,},)
		getApiBudgetStatus.mockResolvedValue({remaining: 0, resetAt: 1_060_000,},)
		const stop = createRateLimitNotice()
		await vi.advanceTimersByTimeAsync(0,)
		expect(findNotice(),).toBeNull()

		await vi.advanceTimersByTimeAsync(1000,)
		expect(findNotice(),).not.toBeNull()
		await stop()
	})

	it('hides once the budget recovers', async () => {
		getApiBudgetStatus.mockResolvedValueOnce({remaining: 0, resetAt: 1_002_000,},)
		getApiBudgetStatus.mockResolvedValue({remaining: 99, resetAt: 1_600_000,},)
		const stop = createRateLimitNotice()
		await vi.advanceTimersByTimeAsync(0,)
		expect(findNotice(),).not.toBeNull()

		await vi.advanceTimersByTimeAsync(1000,)
		expect(findNotice(),).toBeNull()
		await stop()
	})
})
