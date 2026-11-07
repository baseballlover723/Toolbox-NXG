/** Entry point for the Native Mod Log module; wires up the `NN` author tag for Reddit's native notes and mod actions. */

import {createLifecycle,} from '../../framework/lifecycle'
import {Module,} from '../../framework/module'
import {nativeModLog,} from '../../framework/moduleIds'
import {createNativeModLogDisplay,} from './dom'
import {type NativeModLogSettings, settings,} from './settings'

const self = new Module<NativeModLogSettings>({
	name: 'Native Mod Log',
	id: nativeModLog,
	docSlug: 'native-mod-log',
	enabledByDefault: false,
	settings,
}, function init (initialSettings: NativeModLogSettings,) {
	const lifecycle = createLifecycle()
	const display = createNativeModLogDisplay(initialSettings,)

	lifecycle.mount(display.cleanup,)

	return lifecycle.cleanup
},)

export default self
