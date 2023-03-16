import IDependencyResolver from './abstract/IDependencyResolver'
import IEntityBinding from './abstract/IEntityBinding'

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
    type: Type,
    name: TBindingName | null,
    scope: TScopeKey | null
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

/** Array list of bindings */
export type TBindingsList<TypeMap extends object> = IEntityBinding<TypeMap, keyof TypeMap>[]

/** Immutable array list ob bindings */
export type TReadonlyBindingsList<TypeMap extends object> = readonly IEntityBinding<TypeMap, keyof TypeMap>[]

/** Instance provider of specific type */
export type TProvider<Type> = () => Type
