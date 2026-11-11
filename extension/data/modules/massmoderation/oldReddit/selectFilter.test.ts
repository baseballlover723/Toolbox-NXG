/** Tests for reading queue item facts and matching them against select/filter criteria. */

import {describe, expect, it,} from 'vitest'

import {emptyCriteria, type SelectFilterCriteria,} from '../schema'
import {factsMatch, readThingFacts, type ThingFacts, thingMatches,} from './selectFilter'

const nowMs = Date.parse('2026-11-09T12:00:00Z',)

/** Parses one `.thing` from HTML. */
function thing (html: string,): Element {
	const host = document.createElement('div',)
	host.innerHTML = html.trim()
	return host.firstElementChild!
}

/** Criteria with only the given fields switched on. */
function criteria (overrides: Partial<SelectFilterCriteria>,): SelectFilterCriteria {
	return {...emptyCriteria(), ...overrides,}
}

/** Facts for a plain text post, with overrides. */
function facts (overrides: Partial<ThingFacts> = {},): ThingFacts {
	return {
		kinds: new Set(['textPost',],),
		states: new Set(),
		author: 'alice',
		domain: 'self.test',
		subreddit: 'test',
		title: 'a question about rules',
		flairText: '',
		reportText: '',
		reportCount: 0,
		score: 5,
		createdMs: nowMs - 2 * 3_600_000,
		...overrides,
	}
}

describe('readThingFacts', () => {
	it('reads a reported link post with flair', () => {
		const read = readThingFacts(thing(`
			<div class="thing link" data-author="Alice" data-domain="m.YouTube.com" data-subreddit="Test"
				data-timestamp="${nowMs - 3_600_000}">
				<div class="midcol"><div class="score unvoted" title="42">42</div></div>
				<div class="entry">
					<a class="title">Watch This</a>
					<span class="linkflairlabel" title="Video">Video</span>
					<span class="reported-stamp">3 reports</span>
					<ul class="report-reasons"><li class="user-report">spam: Spam</li></ul>
				</div>
			</div>
		`,),)

		expect([...read.kinds,],).toEqual(['linkPost', 'flaired',],)
		expect(read.author,).toBe('alice',)
		expect(read.domain,).toBe('m.youtube.com',)
		expect(read.subreddit,).toBe('test',)
		expect(read.title,).toBe('watch this',)
		expect(read.flairText,).toBe('video',)
		expect(read.reportCount,).toBe(3,)
		expect(read.reportText,).toContain('spam',)
		expect(read.score,).toBe(42,)
		expect(read.createdMs,).toBe(nowMs - 3_600_000,)
	})

	it('reads a hidden score as unknown', () => {
		const read = readThingFacts(thing(`
			<div class="thing comment" data-author="bob">
				<div class="entry"><span class="score unvoted">[score hidden]</span></div>
			</div>
		`,),)

		expect([...read.kinds,],).toEqual(['comment',],)
		expect(read.score,).toBeNull()
		expect(read.domain,).toBeNull()
	})

	it('tells shadow-banned and spam-filtered items apart', () => {
		expect(readThingFacts(thing('<div class="thing link spam banned-user"></div>',),).states,).toEqual(
			new Set(['shadowbanned',],),
		)
		expect(readThingFacts(thing('<div class="thing link spam"></div>',),).states,).toEqual(
			new Set(['spamFiltered',],),
		)
	})

	it('reads actions taken on this page and by other mods', () => {
		const read = readThingFacts(thing(`
			<div class="thing link self approved toolbox-modlog-handled-elsewhere">
				<div class="entry">
					<a class="pretty-button pressed" data-event-action="ignorereports">ignore reports</a>
				</div>
			</div>
		`,),)

		expect(read.kinds,).toEqual(new Set(['textPost',],),)
		expect(read.states,).toEqual(new Set(['handledElsewhere', 'approved', 'ignored',],),)
	})

	it('falls back to the tagline time when there is no data-timestamp', () => {
		const read = readThingFacts(thing(`
			<div class="thing link">
				<p class="tagline"><time datetime="2026-11-09T10:00:00Z">2 hours ago</time></p>
			</div>
		`,),)

		expect(read.createdMs,).toBe(Date.parse('2026-11-09T10:00:00Z',),)
	})
})

describe('factsMatch', () => {
	it('matches everything with empty criteria', () => {
		expect(factsMatch(facts(), emptyCriteria(), nowMs,),).toBe(true,)
	})

	it('ORs choices inside the type group', () => {
		const typeCriteria = criteria({types: ['comment', 'textPost',],},)
		expect(factsMatch(facts(), typeCriteria, nowMs,),).toBe(true,)
		expect(factsMatch(facts({kinds: new Set(['linkPost',],),},), typeCriteria, nowMs,),).toBe(false,)
	})

	it('ANDs groups together', () => {
		const both = criteria({types: ['textPost',], users: {value: 'bob', negate: false,},},)
		expect(factsMatch(facts(), both, nowMs,),).toBe(false,)
		expect(factsMatch(facts({author: 'bob',},), both, nowMs,),).toBe(true,)
	})

	it('negates the type and state groups', () => {
		expect(factsMatch(facts(), criteria({types: ['textPost',], negateTypes: true,},), nowMs,),).toBe(false,)
		expect(factsMatch(facts(), criteria({states: ['approved',], negateStates: true,},), nowMs,),).toBe(true,)
	})

	it('matches users exactly, case-insensitively, from a list with prefixes', () => {
		const users = criteria({users: {value: 'u/Carol, /u/ALICE', negate: false,},},)
		expect(factsMatch(facts(), users, nowMs,),).toBe(true,)
		expect(factsMatch(facts({author: 'alice2',},), users, nowMs,),).toBe(false,)
	})

	it('negates a list', () => {
		const notAlice = criteria({users: {value: 'alice', negate: true,},},)
		expect(factsMatch(facts(), notAlice, nowMs,),).toBe(false,)
		expect(factsMatch(facts({author: 'bob',},), notAlice, nowMs,),).toBe(true,)
	})

	it('matches a domain and its subdomains, but not lookalikes', () => {
		const youtube = criteria({domains: {value: 'youtube.com', negate: false,},},)
		expect(factsMatch(facts({domain: 'm.youtube.com',},), youtube, nowMs,),).toBe(true,)
		expect(factsMatch(facts({domain: 'notyoutube.com',},), youtube, nowMs,),).toBe(false,)
		expect(factsMatch(facts({domain: null,},), youtube, nowMs,),).toBe(false,)
	})

	it('matches title and report text as case-insensitive substrings', () => {
		expect(factsMatch(facts(), criteria({title: {value: 'RULES', negate: false,},},), nowMs,),).toBe(true,)
		expect(factsMatch(facts(), criteria({title: {value: 'rules', negate: true,},},), nowMs,),).toBe(false,)
		expect(
			factsMatch(
				facts({reportText: 'spam: spam',},),
				criteria({reportText: {value: 'Spam', negate: false,},},),
				nowMs,
			),
		).toBe(true,)
	})

	it('treats text that would break a CSS selector as plain text', () => {
		const odd = criteria({title: {value: '") :has(', negate: false,},},)
		expect(factsMatch(facts({title: 'weird ") :has( title',},), odd, nowMs,),).toBe(true,)
	})

	it('compares scores as numbers and never matches a hidden score', () => {
		expect(factsMatch(facts({score: 10,},), criteria({scoreAbove: 9,},), nowMs,),).toBe(true,)
		expect(factsMatch(facts({score: 10,},), criteria({scoreAbove: 10,},), nowMs,),).toBe(false,)
		expect(factsMatch(facts({score: -3,},), criteria({scoreBelow: 0,},), nowMs,),).toBe(true,)
		expect(factsMatch(facts({score: null,},), criteria({scoreBelow: 100,},), nowMs,),).toBe(false,)
	})

	it('requires a minimum report count', () => {
		expect(factsMatch(facts({reportCount: 2,},), criteria({minReports: 2,},), nowMs,),).toBe(true,)
		expect(factsMatch(facts({reportCount: 1,},), criteria({minReports: 2,},), nowMs,),).toBe(false,)
	})

	it('filters by age in hours', () => {
		expect(factsMatch(facts(), criteria({olderThanHours: 1,},), nowMs,),).toBe(true,)
		expect(factsMatch(facts(), criteria({newerThanHours: 1,},), nowMs,),).toBe(false,)
		expect(factsMatch(facts({createdMs: null,},), criteria({newerThanHours: 1,},), nowMs,),).toBe(false,)
	})
})

describe('thingMatches', () => {
	it('reads the item and applies the criteria', () => {
		const comment = thing('<div class="thing comment" data-author="bob"></div>',)
		expect(thingMatches(comment, criteria({types: ['comment',],},), nowMs,),).toBe(true,)
		expect(thingMatches(comment, criteria({users: {value: 'alice', negate: false,},},), nowMs,),).toBe(false,)
	})
})
