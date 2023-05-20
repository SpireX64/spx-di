import IDependencyResolver from './abstract/IDependencyResolver'
import { TBindingsFilter } from './abstract/IContainerConfigurator'
import { TDynamicDIModule } from './modules/DIModule'

/** Factory function of type */
export type TInstanceFactory<TypeMap extends object, Type extends keyof TypeMap> =
    (resolver: IDependencyResolver<TypeMap>) => TypeMap[Type]

/** Scope name type */
export type TScopeKey = string | symbol

/** Binding name type */
export type TBindingName = string | symbol | null

/** Auto-disposable interface */
export interface IDisposable {
    /** Called when the parent scope has been closed */
    dispose(): void
}

export interface IScopeDisposable extends IDisposable {
    /** The key of the scope to which this disposable belongs */
    readonly scopeKey: TScopeKey

    /** Check that the scope has been deleted */
    isScopeDisposed(): boolean
}

export type TRequiredTypeToken<TypeMap extends object, Type extends keyof TypeMap> = {
    type: Type
    filter?: TBindingsFilter
}

export type TConflictResolution =
    | 'bind'
    | 'override'
    | 'throw'
    | 'skip'

/** Binding options */
export type TBindingOptions = {
    /**
     * Name of binding.
     * Allows to inject specific instance by name.
     * @default null
     */
    name?: TBindingName,

    /**
     * Scope(s) in which the instance is available to resolve
     * @default null
     */
    scope?: TScopeKey | TScopeKey[] | null

    /**
     * Resolve method on binding conflict.
     * - 'bind' - Multibinding
     * - 'override' - Override existing binding
     * - 'throw' - Throw error
     * - 'skip' - Leave current binding
     * @default bind
     */
    conflict?: TConflictResolution,
}

export type TDynamicModuleValue<TypeMap extends object, TValue> = {
    dynamic: true
    module: TDynamicDIModule<TypeMap, any>
    get: () => TValue
}

/** Instance provider of specific type */
export type TProvider<Type> = () => Type