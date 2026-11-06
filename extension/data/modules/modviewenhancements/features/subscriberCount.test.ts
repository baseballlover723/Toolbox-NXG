/** Tests for the restored old Reddit sidebar subscriber count. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const getSubredditAbout = vi.hoisted(() => vi.fn())
const platform = vi.hoisted(() => ({isOldReddit: true,}))

vi.mock('../../../api/resources/subreddits', () => ({getSubredditAbout,}),)
vi.mock('../../../util/infra/platform', () => platform,)

import {createSubscriberCountHandlers, subscriberCountClass,} from './subscriberCount'

/** Renders an old Reddit sidebar titlebox; `extra` is appended after the subscribe button. */
function renderSidebar (extra = '',) {
	document.body.innerHTML = `
		<div class="side">
			<div class="titlebox">
				<h1 class="hover redditname"><a href="/r/testsub/">testsub</a></h1>
				<span class="fancy-toggle-button subscribe-button toggle"></span>
				${extra}
				<div class="usertext-body"></div>
			</div>
		</div>
	`
}

/** Lets the pending `about.json` promise chain settle. */
const flush = () => new Promise((resolve,) => setTimeout(resolve, 0,))

const injected = () => document.querySelector<HTMLElement>(`.${subscriberCountClass}`,)

beforeEach(() => {
	platform.isOldReddit = true
	getSubredditAbout.mockReset().mockResolvedValue({title: '', publicDescription: '', subscribers: 1234567,},)
},)

afterEach(() => {
	document.body.innerHTML = ''
},)

describe('createSubscriberCountHandlers', () => {
	it('fetches the current subreddit and injects the formatted count after the subscribe button', async () => {
		renderSidebar()
		createSubscriberCountHandlers(true,)
		await flush()

		expect(getSubredditAbout,).toHaveBeenCalledWith('testsub',)
		const element = injected()
		expect(element?.classList.contains('subscribers',),).toBe(true,)
		expect(element?.querySelector('.number',)?.textContent,).toBe((1234567).toLocaleString(),)
		expect(element?.querySelector('.word',)?.textContent,).toBe('subscribers',)
		expect(element?.previousElementSibling?.classList.contains('subscribe-button',),).toBe(true,)
	})

	it('sits ahead of whatever Reddit now renders in the native count slot', async () => {
		renderSidebar('<p class="users-online"><span class="number">5</span> weekly visitors</p>',)
		createSubscriberCountHandlers(true,)
		await flush()

		expect(injected()?.nextElementSibling?.classList.contains('users-online',),).toBe(true,)
	})

	it('uses the singular word for a count of one', async () => {
		getSubredditAbout.mockResolvedValue({title: '', publicDescription: '', subscribers: 1,},)
		renderSidebar()
		createSubscriberCountHandlers(true,)
		await flush()

		expect(injected()?.querySelector('.word',)?.textContent,).toBe('subscriber',)
	})

	it('does nothing when disabled', async () => {
		renderSidebar()
		createSubscriberCountHandlers(false,)
		await flush()

		expect(getSubredditAbout,).not.toHaveBeenCalled()
		expect(injected(),).toBeNull()
	})

	it('does nothing off old Reddit', async () => {
		platform.isOldReddit = false
		renderSidebar()
		createSubscriberCountHandlers(true,)
		await flush()

		expect(getSubredditAbout,).not.toHaveBeenCalled()
	})

	it('does nothing on pages without a subreddit titlebox', async () => {
		createSubscriberCountHandlers(true,)
		await flush()

		expect(getSubredditAbout,).not.toHaveBeenCalled()
	})

	it('injects nothing when the API omits the count or the request fails', async () => {
		getSubredditAbout.mockResolvedValueOnce({title: '', publicDescription: '', subscribers: null,},)
		renderSidebar()
		createSubscriberCountHandlers(true,)
		await flush()
		expect(injected(),).toBeNull()

		getSubredditAbout.mockRejectedValueOnce(new Error('404',),)
		createSubscriberCountHandlers(true,)
		await flush()
		expect(injected(),).toBeNull()
	})

	it('does not inject twice when the module re-runs', async () => {
		renderSidebar()
		createSubscriberCountHandlers(true,)
		await flush()
		createSubscriberCountHandlers(true,)
		await flush()

		expect(document.querySelectorAll(`.${subscriberCountClass}`,),).toHaveLength(1,)
		expect(getSubredditAbout,).toHaveBeenCalledTimes(1,)
	})

	it('removes the line on cleanup, including when cleanup beats the request', async () => {
		renderSidebar()
		const first = createSubscriberCountHandlers(true,)
		await flush()
		await first.cleanup()
		expect(injected(),).toBeNull()

		const second = createSubscriberCountHandlers(true,)
		await second.cleanup()
		await flush()
		expect(injected(),).toBeNull()
	})
})
