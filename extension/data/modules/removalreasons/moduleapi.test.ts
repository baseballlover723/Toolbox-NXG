/** Tests for getRemovalReasons, focused on the getfrom redirect and its mod-gate opt-in. */

// @vitest-environment node
import {beforeEach, describe, expect, it, vi,} from 'vitest'

const getConfig = vi.hoisted(() => vi.fn())
const recoverSplitChoiceTexts = vi.hoisted(() => vi.fn())
const cacheStore = vi.hoisted(() => new Map<string, unknown>())

vi.mock('../config/moduleapi', () => ({getConfig, saveToolboxConfig: vi.fn(),}),)

// Stub the native-reasons API resource so importing moduleapi doesn't pull in the
// transport/webextension-polyfill chain (this suite runs in the node environment).
vi.mock('../../api/resources/removalReasons', () => ({getNativeRemovalReasons: vi.fn(),}),)

vi.mock('../../util/wiki/wikiMigration', () => ({recoverSplitChoiceTexts,}),)
vi.mock('../../util/persistence/cache', () => ({
	getCache: (moduleID: string, key: string, defaultVal?: unknown,) =>
		Promise.resolve(cacheStore.get(`${moduleID}.${key}`,) ?? defaultVal,),
	setCache: (moduleID: string, key: string, value: unknown,) => {
		cacheStore.set(`${moduleID}.${key}`, value,)
		return Promise.resolve()
	},
}),)

import {findSplitChoiceRepairs, getRemovalReasons, markChoiceRepairChecked,} from './moduleapi'

beforeEach(() => {
	vi.clearAllMocks()
	cacheStore.clear()
},)

describe('findSplitChoiceRepairs', () => {
	it('returns the repairs found, and checks again next time while any are pending', async () => {
		const found = new Map([[0, 'Pick {choice: a}',],],)
		recoverSplitChoiceTexts.mockResolvedValue(found,)

		expect(await findSplitChoiceRepairs('mysub', ['Pick\n\n{choice}\n- a',],),).toBe(found,)
		await findSplitChoiceRepairs('mysub', ['Pick\n\n{choice}\n- a',],)

		expect(recoverSplitChoiceTexts,).toHaveBeenCalledTimes(2,)
	})

	it('never scans a subreddit again once nothing was found there', async () => {
		recoverSplitChoiceTexts.mockResolvedValue(new Map(),)

		await findSplitChoiceRepairs('mysub', ['text',],)
		await findSplitChoiceRepairs('mysub', ['text',],)

		expect(recoverSplitChoiceTexts,).toHaveBeenCalledTimes(1,)
	})

	it('skips a subreddit marked checked after a repair was applied or dismissed', async () => {
		await markChoiceRepairChecked('mysub',)

		expect(await findSplitChoiceRepairs('mysub', ['text',],),).toEqual(new Map(),)
		expect(recoverSplitChoiceTexts,).not.toHaveBeenCalled()
	})
})

describe('getRemovalReasons', () => {
	it('reads the acting sub with the default mod-gate (no opt-in)', async () => {
		getConfig.mockResolvedValue({removalReasons: {reasons: [{text: 'spam',},],},},)

		const result = await getRemovalReasons('mysub',)

		expect(getConfig,).toHaveBeenCalledWith('mysub', {allowNonModerated: false,},)
		expect(result,).toEqual({reasons: [{text: 'spam',},],},)
	})

	it('returns false when the acting sub has no removal reasons configured', async () => {
		getConfig.mockResolvedValue({},)

		expect(await getRemovalReasons('mysub',),).toBe(false,)
	})

	it('follows a getfrom redirect, reading the source sub with the mod-gate opted out', async () => {
		// Shared removal reasons: a sub the viewer moderates points its reasons at a different
		// sub they may not moderate. The acting read stays gated; the source read opts out so
		// the cross-sub share still resolves.
		getConfig.mockImplementation(async (sub: string,) =>
			sub === 'mysub'
				? {removalReasons: {getfrom: 'sharedsub', reasons: [],},}
				: {removalReasons: {reasons: [{text: 'from shared',},],},}
		)

		const result = await getRemovalReasons('mysub',)

		expect(getConfig,).toHaveBeenCalledWith('mysub', {allowNonModerated: false,},)
		expect(getConfig,).toHaveBeenCalledWith('sharedsub', {allowNonModerated: true,},)
		expect(result,).toEqual({reasons: [{text: 'from shared',},],},)
	})

	it('does not follow a self-referential getfrom', async () => {
		getConfig.mockResolvedValue({removalReasons: {getfrom: 'mysub', reasons: [{text: 'self',},],},},)

		const result = await getRemovalReasons('mysub',)

		expect(getConfig,).toHaveBeenCalledTimes(1,)
		expect(result,).toEqual({getfrom: 'mysub', reasons: [{text: 'self',},],},)
	})
})
