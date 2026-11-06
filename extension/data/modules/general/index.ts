/** Entry point for the General Settings module, which holds cross-module preferences like the classic theme, notification style and context menu behavior. */
import {createLifecycle,} from '../../framework/lifecycle'
import {Module,} from '../../framework/module'
import {createClassicThemeHandlers,} from './dom'
import {GenSettings, settings,} from './settings'

const self = new Module<GenSettings>({
	name: 'General Settings',
	id: 'GenSettings',
	docSlug: 'general',
	alwaysEnabled: true,
	settings,
}, ({classicTheme,},) => {
	const lifecycle = createLifecycle()

	const {applyClassicTheme, cleanup,} = createClassicThemeHandlers()
	applyClassicTheme(classicTheme,)
	lifecycle.mount(self.onChange('classicTheme', applyClassicTheme,),)
	lifecycle.mount(cleanup,)

	return lifecycle.cleanup
},)

// Spans settings for several modules, so it's positioned outside the per-module
// list in the settings window
self.sort = {
	location: 'beforeModules',
	order: 2, // below core settings, above toggle modules
}

export default self
