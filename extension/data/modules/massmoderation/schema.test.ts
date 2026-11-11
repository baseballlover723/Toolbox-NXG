/** Tests for the select/filter criteria helpers. */

import {describe, expect, it,} from 'vitest'

import {describeCriteria, emptyCriteria, isEmptyCriteria, parseList, parseStoredCriteria,} from './schema'

describe('parseList', () => {
	it('splits on commas and spaces, lowercases, and drops prefixes', () => {
		expect(parseList(' u/Alice, /u/bob  r/Pics,,carol ',),).toEqual(['alice', 'bob', 'pics', 'carol',],)
	})
})

describe('isEmptyCriteria', () => {
	it('is true only when no group is switched on', () => {
		expect(isEmptyCriteria(emptyCriteria(),),).toBe(true,)
		expect(isEmptyCriteria({...emptyCriteria(), users: {value: '  ', negate: true,},},),).toBe(true,)
		expect(isEmptyCriteria({...emptyCriteria(), minReports: 0,},),).toBe(false,)
		expect(isEmptyCriteria({...emptyCriteria(), types: ['comment',],},),).toBe(false,)
	})
})

describe('describeCriteria', () => {
	it('summarizes each active group', () => {
		expect(describeCriteria({
			...emptyCriteria(),
			types: ['comment', 'textPost',],
			users: {value: 'alice, bob', negate: true,},
			minReports: 2,
		},),).toBe('comments or text posts, user not alice, bob, 2+ reports',)
	})
})

describe('parseStoredCriteria', () => {
	it('round-trips criteria', () => {
		const stored = {
			...emptyCriteria(),
			states: ['spamFiltered',],
			title: {value: 'giveaway', negate: false,},
			scoreBelow: 0,
		}
		expect(parseStoredCriteria(JSON.stringify(stored,),),).toEqual(stored,)
	})

	it('drops unknown or malformed fields', () => {
		const parsed = parseStoredCriteria(JSON.stringify({
			types: ['comment', 'bogus', 3,],
			users: 'alice',
			minReports: '2',
			negateTypes: 'yes',
		},),)
		expect(parsed,).toEqual({...emptyCriteria(), types: ['comment',],},)
	})

	it('returns empty criteria for unparseable input', () => {
		expect(parseStoredCriteria('',),).toEqual(emptyCriteria(),)
		expect(parseStoredCriteria('[1,2]',),).toEqual(emptyCriteria(),)
	})
})
