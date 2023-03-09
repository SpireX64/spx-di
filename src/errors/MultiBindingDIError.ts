import DIError from './DIError'
import Lifecycle from '../Lifecycle'
import type { TBindingName } from '../types'
import { getStringName } from '../abstract/IEntityBinding'

export default class MultiBindingDIError extends DIError {
    public constructor(bindingType: string | symbol | number, bindingName: TBindingName, lifecycle: Lifecycle) {
        let name = getStringName(bindingType)
        if (bindingName != null)
            name += `:${getStringName(bindingName)}`
        super(`Multiple binding of ${lifecycle} "${name}". Multiple binding is only possible for singletons.`)
    }
}