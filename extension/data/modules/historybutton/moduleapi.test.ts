/** Tests for aggregating a user's history into domain, subreddit, and linked-account tables. */

// @vitest-environment node
import {beforeEach, describe, expect, it, vi,} from 'vitest'

const getUserSubmissions = vi.hoisted(() => vi.fn())
const getUserComments = vi.hoisted(() => vi.fn())
vi.mock('../../api/resources/users', () => ({getUserSubmissions, getUserComments, aboutUser: vi.fn(),}),)

import {getCommentHistoryData, getSubmissionHistoryData,} from './moduleapi'

/** A YouTube link submission carrying Reddit's oEmbed data (shape taken from a live submitted.json). */
function youtubePost (authorName: string, authorUrl: string, domain = 'youtube.com',) {
	return {
		kind: 't3',
		data: {
			subreddit: 'music',
			score: 1,
			domain,
			is_self: false,
			url: `https://www.${domain}/watch?v=x`,
			media: {type: domain, oembed: {author_name: authorName, author_url: authorUrl, provider_name: 'YouTube',},},
		},
	}
}

function linkPost (url: string, domain: string,) {
	return {kind: 't3', data: {subreddit: 'music', score: 1, domain, is_self: false, url, media: null,},}
}

function selfPost (selftext: string,) {
	return {kind: 't3', data: {subreddit: 'music', score: 1, domain: 'self.music', is_self: true, selftext,},}
}

beforeEach(() => {
	getUserSubmissions.mockReset()
	getUserComments.mockReset()
},)

describe('getSubmissionHistoryData', () => {
	it('groups oEmbed channels with direct channel links and counts them per account', async () => {
		getUserSubmissions.mockResolvedValue([
			youtubePost('Pixies - Topic', 'https://www.youtube.com/channel/UCRt5ckI8kNVMFr-jyj1IIVg',),
			youtubePost('Pixies - Topic', 'https://www.youtube.com/channel/UCRt5ckI8kNVMFr-jyj1IIVg',),
			youtubePost('KornVEVO', 'https://www.youtube.com/@KornVEVO',),
			youtubePost('Earache Catalog', 'https://www.youtube.com/@EaracheCatalog', 'youtu.be',),
			linkPost('https://www.youtube.com/@kornvevo', 'youtube.com',),
			linkPost('https://x.com/someone/status/1', 'x.com',),
			linkPost('https://example.com/article', 'example.com',),
		],)

		const data = await getSubmissionHistoryData('alice',)

		expect(data.total,).toBe(7,)
		expect(Object.values(data.accounts,).map(({name, provider, count,},) => [name, provider, count,]),).toEqual([
			['Pixies - Topic', 'YouTube', 2,],
			['KornVEVO', 'YouTube', 2,],
			['Earache Catalog', 'YouTube', 1,],
			['someone', 'X / Twitter', 1,],
		],)
	})

	it('counts accounts linked in selfpost bodies separately from submitted links', async () => {
		getUserSubmissions.mockResolvedValue([
			selfPost('Check out [my channel](https://www.youtube.com/@spammer) and https://x.com/spammer.',),
			selfPost('Again: https://www.youtube.com/@Spammer',),
		],)

		const data = await getSubmissionHistoryData('alice',)

		expect(data.accounts,).toEqual({},)
		expect(Object.values(data.textLinkAccounts,).map(({name, count,},) => [name, count,]),).toEqual([
			['spammer', 2,],
			['spammer', 1,],
		],)
		expect(data.textLinkDomains,).toEqual({'www.youtube.com': {count: 2,}, 'x.com': {count: 1,},},)
	})
})

describe('removed submissions', () => {
	it('counts removals by others overall and per subreddit, but not self-deletions', async () => {
		const post = (subreddit: string, category: string | null,) => ({
			kind: 't3',
			data: {subreddit, score: 1, domain: 'example.com', is_self: false, url: '', removed_by_category: category,},
		})
		getUserSubmissions.mockResolvedValue([
			post('a', 'moderator',),
			post('a', 'automod_filtered',),
			post('a', null,),
			post('b', 'reddit',),
			post('b', 'author',),
			post('b', 'deleted',),
		],)

		const data = await getSubmissionHistoryData('alice',)

		expect(data.removed,).toBe(3,)
		expect(data.subreddits['a']?.removed,).toBe(2,)
		expect(data.subreddits['b']?.removed,).toBe(1,)
	})
})

describe('getCommentHistoryData', () => {
	it('counts comments made as OP and on deleted posts', async () => {
		getUserComments.mockResolvedValue([
			{kind: 't1', data: {subreddit: 'a', body: 'x', link_author: 'Alice',},},
			{kind: 't1', data: {subreddit: 'a', body: 'x', link_author: 'alice',},},
			{kind: 't1', data: {subreddit: 'a', body: 'x', link_author: '[deleted]',},},
			{kind: 't1', data: {subreddit: 'a', body: 'x', link_author: 'bob',},},
			{kind: 't1', data: {subreddit: 'a', body: 'x',},},
		],)

		const data = await getCommentHistoryData('alice', 100,)

		expect(data.opCount,).toBe(2,)
		expect(data.deletedPostCount,).toBe(1,)
	})

	it('counts accounts linked in comment bodies', async () => {
		getUserComments.mockResolvedValue([
			{kind: 't1', data: {subreddit: 'a', body: 'sub to https://www.youtube.com/@spammer!',},},
			{kind: 't1', data: {subreddit: 'b', body: 'no links here',},},
			{
				kind: 't1',
				data: {subreddit: 'a', body: 'https://www.reddit.com/r/foo and https://spammer.substack.com/p/x',},
			},
		],)

		const data = await getCommentHistoryData('alice', 100,)

		expect(data.total,).toBe(3,)
		expect(Object.values(data.linkAccounts,).map(({provider, name, count,},) => [provider, name, count,]),).toEqual(
			[
				['YouTube', 'spammer', 1,],
				['Substack', 'spammer', 1,],
			],
		)
	})
})
