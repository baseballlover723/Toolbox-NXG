/** Tests for opening new Reddit's header modmail button in a new tab. */

import {afterEach, beforeEach, describe, expect, it, vi,} from 'vitest'

const settingsValues = vi.hoisted((): Record<string, unknown> => ({}))

vi.mock('webextension-polyfill', () => ({
	default: {runtime: {getURL: (path: string,) => `chrome-extension://fake/${path}`,},},
}),)
vi.mock('../../../store', () => ({default: {getState: () => ({settings: {values: settingsValues,},}),},}),)

import {createHeaderModmailNewTabHandlers, headerModmailHref, isModmailUrl,} from './headerModmailNewTab'

describe('isModmailUrl', () => {
	it.each([
		'https://www.reddit.com/mail/all',
		'https://www.reddit.com/mail',
		'https://mod.reddit.com/mail/inbox',
		'https://www.reddit.com/mod/mail/inbox',
		'/mail/inbox',
	],)('accepts %s', (href,) => {
		expect(isModmailUrl(href,),).toBe(true,)
	},)

	it.each([
		'https://www.reddit.com/r/mail',
		'https://www.reddit.com/mailbox',
		'https://www.reddit.com/message/inbox',
		'https://example.com/mail/all',
	],)('rejects %s', (href,) => {
		expect(isModmailUrl(href,),).toBe(false,)
	},)
})

/** Builds a header whose modmail link sits inside a shadow root, as new Reddit's does. */
function shadowHeaderLink (href: string,) {
	const host = document.createElement('reddit-header-large',)
	document.body.appendChild(host,)
	const shadow = host.attachShadow({mode: 'open',},)
	const link = document.createElement('a',)
	link.href = href
	const icon = document.createElement('span',)
	link.appendChild(icon,)
	shadow.appendChild(link,)
	return {host, link, icon,}
}

/** Dispatches a click on `target` and returns the event. */
function click (target: Element, init: MouseEventInit = {},): MouseEvent {
	const event = new MouseEvent('click', {bubbles: true, composed: true, cancelable: true, button: 0, ...init,},)
	target.dispatchEvent(event,)
	return event
}

describe('headerModmailHref', () => {
	afterEach(() => {
		document.body.innerHTML = ''
	},)

	it('finds a modmail link inside a shadow-DOM header', () => {
		const {icon,} = shadowHeaderLink('https://www.reddit.com/mail/inbox',)
		let found: string | null = null
		document.addEventListener('click', (event,) => {
			found = headerModmailHref(event.composedPath(),)
		}, {once: true,},)
		click(icon,)
		expect(found,).toBe('https://www.reddit.com/mail/inbox',)
	})

	it('ignores modmail links outside the header', () => {
		const link = document.createElement('a',)
		link.href = 'https://www.reddit.com/mail/inbox'
		document.body.appendChild(link,)
		let found: string | null = 'unset'
		document.addEventListener('click', (event,) => {
			found = headerModmailHref(event.composedPath(),)
		}, {once: true,},)
		click(link,)
		expect(found,).toBeNull()
	})
})

describe('createHeaderModmailNewTabHandlers', () => {
	const open = vi.fn()
	let remove: () => void

	beforeEach(() => {
		vi.stubGlobal('open', open,)
		const {handleClick,} = createHeaderModmailNewTabHandlers()
		window.addEventListener('click', handleClick, true,)
		remove = () => window.removeEventListener('click', handleClick, true,)
	},)

	afterEach(() => {
		remove()
		vi.unstubAllGlobals()
		open.mockReset()
		for (const key of Object.keys(settingsValues,)) { delete settingsValues[key] }
		document.body.innerHTML = ''
	},)

	it('opens the header modmail link in a new tab when the setting is on', () => {
		settingsValues['Toolbox.Modmail.openInNewTab'] = true
		const {icon,} = shadowHeaderLink('https://www.reddit.com/mail/inbox',)

		const event = click(icon,)

		expect(open,).toHaveBeenCalledWith('https://www.reddit.com/mail/inbox', '_blank', 'noopener',)
		expect(event.defaultPrevented,).toBe(true,)
	})

	it('leaves the click alone when the setting is off', () => {
		const {icon,} = shadowHeaderLink('https://www.reddit.com/mail/inbox',)

		const event = click(icon,)

		expect(open,).not.toHaveBeenCalled()
		expect(event.defaultPrevented,).toBe(false,)
	})

	it('leaves the click alone when the Modmail module is disabled', () => {
		settingsValues['Toolbox.Modmail.openInNewTab'] = true
		settingsValues['Toolbox.Modmail.enabled'] = false
		const {icon,} = shadowHeaderLink('https://www.reddit.com/mail/inbox',)

		click(icon,)

		expect(open,).not.toHaveBeenCalled()
	})

	it('leaves modified clicks to the browser', () => {
		settingsValues['Toolbox.Modmail.openInNewTab'] = true
		const {icon,} = shadowHeaderLink('https://www.reddit.com/mail/inbox',)

		const event = click(icon, {ctrlKey: true,},)

		expect(open,).not.toHaveBeenCalled()
		expect(event.defaultPrevented,).toBe(false,)
	})
})
