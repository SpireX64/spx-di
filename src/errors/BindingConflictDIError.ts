import DIError from './DIError'
import {TBindingName} from "../types";
import {getStringName} from "../abstract/IEntityBinding";

export default class BindingConflictDIError extends DIError {
    public constructor(type: string | symbol | number, bindingName: TBindingName) {
        let name = getStringName(type)
        if (bindingName != null)
            name += `:${getStringName(bindingName)}`
        super(`Found binding conflict of type "${name}"`);
    }
}