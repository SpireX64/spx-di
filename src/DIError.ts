// @ts-nocheck DIError uses ES5 constructor for better Error implementation
import { TBindingName, TScopeKey } from './types'
import ITypeBinding, { getStringName } from './abstract/ITypeBinding'
import Lifecycle from './Lifecycle'

export enum DIErrorType {
    BindingConflict= 'BindingConflict',
    BindingNotFound = 'BindingNotFound',
    DisposedScopeAccess = 'DisposedScopeAccess',
    DependencyCycle = 'DependencyCycle',
    InvalidMultiBinding = 'InvalidMultiBinding',
    NullableBinding = 'NullableBinding',
    MissingRequiredType = 'MissingRequiredType',
    IllegalState = 'IllegalState',
}

function getTypeName(type: string | symbol | number, bindingName: TBindingName): string {
    let typeName = getStringName(type)
    if (bindingName != null) typeName += `:${getStringName(bindingName)}`
    return typeName
}

export interface DIError extends Error {
    readonly type: DIErrorType
}

export const DIError = function(type, message, cause) {
    const error = Error.apply(this, [ message, cause ])
    this.name = error.name = `DIError.${type}`
    this.type = type
    this.message = message
    this.cause = cause
    Object.defineProperty(this, 'stack', {
        get() { return error.stack },
        configurable: true,
    })
} as any as { new(type: DIErrorType, message: string, cause: Error): DIError } & Readonly<typeof DIErrorFactory>
DIError.prototype = Error.prototype


const DIErrorFactory = {
    illegalState: (message: string, cause?: Error) =>
        new DIError(DIErrorType.IllegalState, message, cause),

    bindingConflict: (type: string | symbol | number, bindingName: TBindingName) =>
        new DIError(DIErrorType.BindingConflict, `Found binding conflict of type "${getTypeName(type, bindingName)}"`),

    bindingNotFound: (type: string | symbol | number, bindingName: TBindingName, scope: TScopeKey) =>
        new DIError(DIErrorType.BindingNotFound, `Binding of type "${getTypeName(type, bindingName)}" not found in scope "${getStringName(scope)}"`),

    disposedScopeAccess: (scope: TScopeKey) =>
        new DIError(DIErrorType.DisposedScopeAccess, `Attempt to resolve instance from disposed scope ${scope.toString()}`),

    dependencyCycle: (activationChain: readonly ITypeBinding<any, any>[]) => {
        const graph = activationChain.map(it => {
            let typeName = getStringName(it.type)
            if (it.name != null)
                typeName += `:${getStringName(it.name)}`
            return typeName
        }).join(' -> ')
        return new DIError(DIErrorType.DependencyCycle, `Dependency cycle detected [${graph}]`);
    },

    invalidMultiBinding: (type: string | symbol | number, bindingName: TBindingName, lifecycle: Lifecycle) =>
        new DIError(
            DIErrorType.InvalidMultiBinding,
            `Multiple binding of ${lifecycle} "${getTypeName(type, bindingName)}". Multibinding is only possible for singletons.`,
        ),

    nullableBinding: (type: string | symbol | number, bindingName: TBindingName) =>
        new DIError(DIErrorType.NullableBinding, `Unexpected nullable binding of type "${getTypeName(type, bindingName)}"`),

    missingRequiredType: (type: string | symbol | number, name: TBindingName, scope: TScopeKey | null = null) => {
        let message = `Required type "${getTypeName(type, name)}" is not provided`
        if (scope != null) message += ` in scope "${getStringName(scope)}"`
        return new DIError(DIErrorType.MissingRequiredType, message);
    },
}
Object.assign(DIError, DIErrorFactory)
