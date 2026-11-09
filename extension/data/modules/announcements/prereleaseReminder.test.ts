/** Tests for when the prerelease reminder shows and how it is dismissed. */
import {beforeEach, describe, expect, it, vi,} from 'vitest'

const build = vi.hoisted(() => ({type: 'beta' as 'stable' | 'beta' | 'dev',}))
const showLabel = vi.hoisted(() => ({value: false as unknown,}))

vi.mock('../../util/infra/buildenv', () => ({
	get buildType () {
		return build.type
	},
}),)
vi.mock('../../util/infra/version', () => ({toolboxVersion: '8.0.0.14 beta abc1234',}),)
vi.mock('../../util/persistence/settings', () => ({
	getSettingAsync: vi.fn(() => Promise.resolve(showLabel.value,)),
}),)

const {dismissPrereleaseReminder, pendingPrereleaseReminder, prereleaseReminderId,} = await import(
	'./prereleaseReminder'
)

beforeEach(() => {
	build.type = 'beta'
	showLabel.value = false
	sessionStorage.clear()
},)

describe('pendingPrereleaseReminder', () => {
	it('shows on a beta build with the version label off', async () => {
		const note = await pendingPrereleaseReminder()
		expect(note?.id,).toBe(prereleaseReminderId,)
		expect(note?.body,).toContain('8.0.0.14 beta abc1234',)
	})

	it('does not show while the version label is on', async () => {
		showLabel.value = true
		expect(await pendingPrereleaseReminder(),).toBeNull()
	})

	it('never shows on a stable build', async () => {
		build.type = 'stable'
		expect(await pendingPrereleaseReminder(),).toBeNull()
	})

	it('stays away in this tab once dismissed', async () => {
		dismissPrereleaseReminder()
		expect(await pendingPrereleaseReminder(),).toBeNull()
		// A new tab starts with fresh session storage.
		sessionStorage.clear()
		expect(await pendingPrereleaseReminder(),).not.toBeNull()
	})
})
