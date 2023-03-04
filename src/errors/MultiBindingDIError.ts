import DIError from './DIError'
import { Lifecycle, TBindingName } from '../types'

export default class MultiBindingDIError extends DIError {
    public constructor(bindingType: string, bindingName: TBindingName, lifecycle: Lifecycle) {
        let name = bindingType
        if (bindingName != null)
            name += `:${bindingName}`
        super(`Multiple binding of ${lifecycle} "${name}". Multiple binding is only possible for singletons.`)
    }
}