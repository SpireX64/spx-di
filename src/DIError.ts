import { TBindingName, TScopeKey } from './types'
import ITypeBinding, { getStringName } from './abstract/ITypeBinding'
import Lifecycle from './Lifecycle'

export enum DIErrorType {
    BindingConflict,
    BindingNotFound,
    IllegalClosedScopeAccess,
    DependencyCycle,
    InvalidMultiBinding,
    NullableBinding,
    MissingRequiredType,
    IllegalState,
}

function getTypeName(type: string | symbol | number, bindingName: TBindingName): string {
    let typeName = getStringName(type)
    if (bindingName != null) typeName += `:${getStringName(bindingName)}`
    return typeName
}

export default class DIError {
    public static illegalState(message: string, innerError?: DIError | Error) {
        return new DIError(DIErrorType.IllegalState, message, innerError)
    }

    public static bindingConflict(type: string | symbol | number, bindingName: TBindingName): DIError {
        return new DIError(
            DIErrorType.BindingConflict,
            `Found binding conflict of type "${getTypeName(type, bindingName)}"`,
        )
    }

    public static bindingNotFound(type: string | symbol | number, bindingName: TBindingName, scope: TScopeKey): DIError {
        return new DIError(
            DIErrorType.BindingNotFound,
            `Binding of type "${getTypeName(type, bindingName)}" not found in scope ${getStringName(scope)}`,
        )
    }

    public static illegalClosedScopeAccess(scope: TScopeKey): DIError {
        return new DIError(
            DIErrorType.IllegalClosedScopeAccess,
            `Attempt to resolve instance from closed scope ${scope.toString()}`,
        )
    }

    public static dependencyCycle(activationChain: readonly ITypeBinding<any, any>[]): DIError {
        const graph = activationChain.map(it => {
            let typeName = getStringName(it.type)
            if (it.name != null)
                typeName += `:${getStringName(it.name)}`
            return typeName
        }).join(' -> ')
        return new DIError(
            DIErrorType.DependencyCycle,
            `Dependency cycle detected [${graph}]`,
        )
    }

    public static invalidMultiBinding(type: string | symbol | number, bindingName: TBindingName, lifecycle: Lifecycle): DIError {
        return new DIError(
            DIErrorType.InvalidMultiBinding,
            `Multiple binding of ${lifecycle} "${getTypeName(type, bindingName)}". Multibinding is only possible for singletons.`,
        )
    }

    public static nullableBinding(type: string | symbol | number, bindingName: TBindingName): DIError {
        return new DIError(
            DIErrorType.NullableBinding,
            `Unexpected nullable binding of type "${getTypeName(type, bindingName)}"`
        )
    }

    public static missingRequiredType(type: string | symbol | number, name: TBindingName, scope: TScopeKey | null = null): DIError {
        let message = `Required type "${getTypeName(type, name)}" is not provided`
        if (scope != null)
            message += ` in scope "${getStringName(scope)}"`
        return new DIError(
            DIErrorType.MissingRequiredType,
            message,
        )
    }

    public readonly stack: string = ''
    public readonly innerError: DIError | Error | null = null
    public constructor(
        public readonly errorType: DIErrorType,
        public readonly message: string,
        innerError: DIError | Error | null = null,
    ) {
        this.innerError = innerError ?? null
        Error.captureStackTrace(this, DIError)
    }
}
