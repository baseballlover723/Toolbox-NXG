/** Keeps Toolbox's dark palette in step with Reddit's own theme on shreddit pages. */

import {createLifecycle,} from '../../framework/lifecycle'

/** Class on the root element that switches Toolbox's colour tokens to the dark palette. */
export const darkClass = 'toolbox-os-dark'

/**
 * Whether the page is in dark mode. Shreddit marks its theme on `<html>` with `theme-dark`
 * or `theme-light`, and that is what decides: a moderator can pick Reddit's light theme on
 * a dark OS (or the other way round), and following the OS then put Toolbox's dark
 * controls on a light page. The OS setting only decides when Reddit gives neither class.
 * @param root The page's root element.
 * @param osDark Whether the OS prefers a dark colour scheme.
 */
export function isPageDark (root: Element, osDark: boolean,): boolean {
	if (root.classList.contains('theme-dark',)) { return true }
	if (root.classList.contains('theme-light',)) { return false }
	return osDark
}

/**
 * Applies {@link darkClass} to match the page's theme, and keeps it matching when Reddit
 * switches theme in place (its theme toggle swaps the class without a reload) or the OS
 * setting changes.
 * @returns Stops watching.
 */
export function syncDarkClass (): () => void | Promise<void> {
	const scope = createLifecycle()
	const root = document.documentElement
	const osDark = window.matchMedia('(prefers-color-scheme: dark)',)
	// Toggling to the state the class is already in changes nothing, so the observer's own
	// writes never feed back into it.
	const sync = () => root.classList.toggle(darkClass, isPageDark(root, osDark.matches,),)
	sync()
	scope.on(osDark, 'change', sync,)
	scope.observe(root, sync, {attributes: true, attributeFilter: ['class',],},)
	return scope.cleanup
}
