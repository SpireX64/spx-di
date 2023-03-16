import DIError from './DIError'
import {TBindingName, TScopeKey} from '../types'
import { getStringName } from '../abstract/IEntityBinding'

export default class RequiredBindingNotProvidedDIError extends DIError {
    public readonly type: string | symbol | number
    public readonly instanceName: TBindingName
    public readonly scope: TScopeKey | null

    public constructor(type: string | symbol | number, name: TBindingName, scope: TScopeKey | null = null) {
        let typeName = getStringName(type)
        if (name != null)
            typeName += ':' + getStringName(name)
        let message = `Required type "${typeName}" is not provided`
        if (scope != null)
            message += ` in scope "${getStringName(scope)}"`
        super(message)

        this.type = type
        this.instanceName = name
        this.scope = scope
    }
}