/** Applies the classic (6.x look) theme by toggling its class on the document root. */
import {createLifecycle,} from '../../framework/lifecycle'

/**
 * Root class that activates the classic theme's token overrides in css/classic.css.
 * It lives on `<html>` so the overrides inherit into every light-DOM mount and shadow root.
 */
export const classicThemeClass = 'toolbox-theme-classic'

/** Handler bundle returned by {@link createClassicThemeHandlers}. */
export interface ClassicThemeHandlers {
	/** Turns the classic theme on or off. Safe to call repeatedly with the same value. */
	applyClassicTheme: (enabled: boolean,) => void
	/** Removes the theme class, restoring the default look. */
	cleanup: () => Promise<void>
}

/**
 * Creates the handlers that switch the classic theme on and off.
 * @returns The apply handler and a cleanup that removes the theme class.
 */
export function createClassicThemeHandlers (): ClassicThemeHandlers {
	const scope = createLifecycle()
	scope.mount(() => document.documentElement.classList.remove(classicThemeClass,))

	const applyClassicTheme = (enabled: boolean,) => {
		document.documentElement.classList.toggle(classicThemeClass, enabled,)
	}

	return {applyClassicTheme, cleanup: scope.cleanup,}
}
