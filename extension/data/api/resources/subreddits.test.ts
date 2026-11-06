/** Tests for subreddits API. */

import {beforeEach, describe, expect, it, vi,} from 'vitest'

const apiOauthGetJSON = vi.hoisted(() => vi.fn())

vi.mock('../transport/http', () => ({apiOauthGetJSON,}),)

import {
	getModerationQueueListing,
	getModLog,
	getModLogByPath,
	getModLogEntries,
	getSubredditAbout,
	getSubredditListing,
} from './subreddits'

beforeEach(() => {
	apiOauthGetJSON.mockReset().mockResolvedValue({data: {children: [],},},)
},)

describe('subreddits API', () => {
	it('fetches mod log for a subreddit', async () => {
		await getModLog('testsub', {limit: '25',},)
		expect(apiOauthGetJSON,).toHaveBeenCalledWith('/r/testsub/about/log.json', {limit: '25',},)
	})

	it('fetches and unwraps mod-log entries to their child data', async () => {
		apiOauthGetJSON.mockResolvedValueOnce({
			data: {children: [{data: {action: 'removelink',},}, {data: {action: 'approvelink',},},],},
		},)
		const entries = await getModLogEntries('testsub',)
		expect(apiOauthGetJSON,).toHaveBeenCalledWith('/r/testsub/about/log.json', {limit: '100', raw_json: '1',},)
		expect(entries,).toEqual([{action: 'removelink',}, {action: 'approvelink',},],)
	})

	it('fetches subreddit about listings by page name', async () => {
		await getSubredditListing('testsub', 'contributors', {user: 'alice',},)
		expect(apiOauthGetJSON,).toHaveBeenCalledWith('/r/testsub/about/contributors.json', {user: 'alice',},)
	})

	it('fetches mod log listings from a subreddit path', async () => {
		await getModLogByPath('/r/testsub/', {limit: '100',},)

		expect(apiOauthGetJSON,).toHaveBeenCalledWith('/r/testsub/about/log.json', {limit: '100',},)
	})

	it('fetches moderation queue listings via OAuth', async () => {
		await getModerationQueueListing({subreddits: 'a+b', page: 'modqueue', limit: 100,},)
		await getModerationQueueListing({subreddits: 'mod', page: 'unmoderated', limit: 50,},)

		expect(apiOauthGetJSON.mock.calls,).toContainEqual(['/r/a+b/about/modqueue.json', {limit: '100',},],)
		expect(apiOauthGetJSON.mock.calls,).toContainEqual(['/r/mod/about/unmoderated.json', {limit: '50',},],)
	})
})

describe('getSubredditAbout', () => {
	it('maps title, description and subscriber count from about.json', async () => {
		apiOauthGetJSON.mockResolvedValueOnce({
			data: {title: 'Test Sub', public_description: 'A sub', subscribers: 4321,},
		},)
		await expect(getSubredditAbout('testsub',),).resolves.toEqual({
			title: 'Test Sub',
			publicDescription: 'A sub',
			subscribers: 4321,
		},)
		expect(apiOauthGetJSON,).toHaveBeenCalledWith('/r/testsub/about.json',)
	})

	it('reports a null count when the field is missing or not a number', async () => {
		apiOauthGetJSON.mockResolvedValueOnce({data: {},},)
		await expect(getSubredditAbout('a',),).resolves.toMatchObject({subscribers: null,},)
		apiOauthGetJSON.mockResolvedValueOnce({data: {subscribers: 'lots',},},)
		await expect(getSubredditAbout('b',),).resolves.toMatchObject({subscribers: null,},)
	})
})
