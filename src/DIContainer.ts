import IEntityBinding from './abstract/IEntityBinding'
import IDependencyResolver from './abstract/IDependencyResolver'
import EntityActivator from './internal/EntityActivator'
import DIScope from './internal/DIScope'
import DIError from './DIError'
import Lifecycle from './Lifecycle'
import type {
    IScopeDisposable,
    TBindingName,
    TBindingOptions,
    TBindingsList,
    TInstanceFactory,
    TProvider,
    TScopeKey,
} from './types'
import { TRequiredTypeToken } from './types'

export default class DIContainer<TypeMap extends object> implements IDependencyResolver<TypeMap> {

    public static readonly globalScopeKey: TScopeKey = Symbol('global')
    private readonly _globalScope: DIScope<TypeMap>
    private readonly _activator: EntityActivator<TypeMap>
    private readonly _scopes = new Map<TScopeKey, DIScope<TypeMap>>()

    public constructor(activator: EntityActivator<TypeMap>) {
        this._activator = activator
        this._globalScope = new DIScope<TypeMap>(DIContainer.globalScopeKey, activator)
        this._scopes.set(this._globalScope.key, this._globalScope)
    }

    public get<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        return this._globalScope.get(type, name)
    }

    public getOptional<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type] | undefined {
        return this._globalScope.getOptional(type, name)
    }

    public getAll<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): ReadonlyArray<TypeMap[Type]> {
        return this._globalScope.getAll(type, name)
    }

    public getLazy<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        return this._globalScope.getLazy(type, name);
    }

    public getProvider<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TProvider<TypeMap[Type]> {
        return this._globalScope.getProvider(type, name)
    }

    public getScopeDisposable(scopeKey?: TScopeKey): IScopeDisposable {
        const scopeRef = scopeKey != null ? this.scope(scopeKey) : this._globalScope
        return scopeRef.getScopeDisposable()
    }

    public scope(key: TScopeKey): IDependencyResolver<TypeMap> {
        let scope: DIScope<TypeMap> | undefined = this._scopes.get(key)
        if (scope != null && scope) {
            if (!scope.isDisposed())
                return scope
        }

        scope = new DIScope(key, this._activator, this._globalScope)
        this._scopes.set(key, scope)
        return scope
    }

    public disposeScope(key: TScopeKey): void {
        if (key === DIContainer.globalScopeKey) return
        const scope = this._scopes.get(key)
        if (!scope) return
        this._scopes.delete(key)
        scope.dispose()
    }

    public static builder<TypeMap extends object = {}>(){
        return new DIContainerBuilder<TypeMap>()
    }
}
export interface IConditionalBinder<
    TypeMap extends object,
    TBuilder extends IDIModuleBuilder<TypeMap>
> {
    bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): TBuilder

    bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle?: Lifecycle,
        options?: TBindingOptions,
    ): TBuilder
}

export interface IDIConfiguration<TypeMap extends object> {
    /**
     * Find binding entity of given {@link type}
     * @param type - Access key of type
     * @param name - (opt.) Instance name
     * @returns binding entity of {@link type} or null
     */
    findBindingOf<Type extends keyof TypeMap>(type: Type, name?: TBindingName): IEntityBinding<TypeMap, Type> | null

    /**
     * Returns all bindings entities of given {@link type}
     * @param type - Access key of type
     * @param name - (opt.) Instance name
     * @returns readonly list of bindings entities
     */
    getAllBindingsOf<Type extends keyof TypeMap>(type: Type, name?: TBindingName): readonly IEntityBinding<TypeMap, Type>[]
}

interface IDIModuleBuilder<TypeMap extends object> extends IDIConfiguration<TypeMap>{
    /**
     * Conditional binding.
     * When param {@link condition} is false, skip next binding call.
     * @param condition - binding condition
     */
    when(condition: boolean | ((builder: IDIConfiguration<TypeMap>) => boolean)): IConditionalBinder<TypeMap, IDIModuleBuilder<TypeMap>>

    /**
     * Bind type with instance/value
     * @param type Access key of the type
     * @param instance instance of type to bind
     * @param options - (opt.) Extra binding options
     */
    bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): IDIModuleBuilder<TypeMap>

    /**
     * Bind type with factory function
     * @param type - Access key of the type
     * @param factory - Factory function
     * @param lifecycle - (opt.) Activated instance lifecycle (default = Singleton)
     * @param options - (opt.) Extra binding options
     */
    bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle?: Lifecycle,
        options?: TBindingOptions,
    ): IDIModuleBuilder<TypeMap>

    /**
     * Requiring Type Binding in Configuration.
     * Throws error if required binding not provided
     * @param type - Key of required type
     * @param options - Additional options
     */
    requireType<Type extends keyof TypeMap>(
        type: Type,
        options?: {
            /** Specific instance name */
            name?: TBindingName

            /** Available in scope */
            scope?: TScopeKey
        },
    ): IDIModuleBuilder<TypeMap>
}

export class DIContainerBuilder<TypeMap extends object> implements IDIModuleBuilder<TypeMap> {
    private readonly _bindings: TBindingsList<TypeMap> = []
    private readonly _requiredTypes: TRequiredTypeToken<TypeMap, keyof TypeMap>[] = []

    public when(condition: boolean | ((builder: IDIConfiguration<TypeMap>) => boolean)): IConditionalBinder<TypeMap, DIContainerBuilder<TypeMap>> {
        const builder: DIContainerBuilder<TypeMap> = this
        const isAllowToBind = typeof condition === 'function' ? condition(this) : condition
        return {
            bindInstance<Type extends keyof TypeMap>(
                type: Type,
                instance: TypeMap[Type],
                options?: TBindingOptions,
            ): DIContainerBuilder<TypeMap> {
                if (isAllowToBind)
                    builder.bindInstance(type, instance, options)
                return builder
            },
            bindFactory<Type extends keyof TypeMap>(
                type: Type,
                factory: TInstanceFactory<TypeMap, Type>,
                lifecycle?: Lifecycle,
                options?: TBindingOptions,
            ): DIContainerBuilder<TypeMap> {
                if (isAllowToBind)
                    builder.bindFactory(type, factory, lifecycle, options)
                return builder
            },
        }
    }

    public bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw DIError.nullableBinding(type, options?.name ?? null)
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            scope: options?.scope ?? null,
            lifecycle: Lifecycle.Singleton,
            instance,
            factory: null,
        }
        this.bind(binding, options)
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle = Lifecycle.Singleton,
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw DIError.nullableBinding(type, options?.name ?? null)
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            scope: options?.scope ?? null,
            lifecycle,
            factory,
            instance: null,
        }
        this.bind(binding, options)
        return this
    }

    public requireType<Type extends keyof TypeMap>(
        type: Type,
        options?: {
            /** Specific instance name */
            name?: TBindingName

            /** Available in scope */
            scope?: TScopeKey
        },
    ): DIContainerBuilder<TypeMap> {
        const token: TRequiredTypeToken<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            scope: options?.scope ?? null,
        }
        this._requiredTypes.push(token)
        return this
    }

    /**
     * Add module to container
     * @param module - Module definition
     * @returns Container builder expanded by {@link module} type map
     */
    public useModule<ModuleTypeMap extends object>(module: DIModuleFunction<ModuleTypeMap, any>): DIContainerBuilder<TypeMap & ModuleTypeMap> {
        // @ts-ignore
        module(this as DIContainerBuilder<TypeMap & ModuleTypeMap>)
        // @ts-ignore
        return this as DIContainerBuilder<TypeMap & ModuleTypeMap>
    }

    public findBindingOf<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): IEntityBinding<TypeMap, Type> | null {
        const binding = this._bindings.find(it => it.type === type && it.name == name)
        if (binding == null) return null
        return binding as IEntityBinding<TypeMap, Type>
    }

    public getAllBindingsOf<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): readonly IEntityBinding<TypeMap, Type>[] {
        return this._bindings.filter(it => it.type === type && it.name === name) as IEntityBinding<TypeMap, Type>[]
    }

    /**
     * Finalize configuration and build container.
     * All singleton instances will be activated.
     */
    public build(): DIContainer<TypeMap> {
        this.verifyRequiredTypes()
        const activator = new EntityActivator(this._bindings)
        return new DIContainer(activator)
    }

    /**
     * Check type requirements. Throws error if required binding not found.
     * @throws RequiredBindingNotProvidedDIError
     * @private
     */
    private verifyRequiredTypes(): void {
        if (this._requiredTypes.length === 0) return
        for (let i = 0; i < this._requiredTypes.length; ++i) {
            const token = this._requiredTypes[i]
            const typeBindings = this.getAllBindingsOf(token.type, token.name)
            if (typeBindings.length === 0)
                throw DIError.missingRequiredType(token.type, token.name, token.scope)
            if (token.scope != null) {
                const availableInScope = typeBindings.some(({ scope }) =>
                    scope == null || (Array.isArray(scope) ? scope?.includes(token.scope!) : scope === token.scope)
                )
                if (!availableInScope)
                    throw DIError.missingRequiredType(token.type, token.name, token.scope)
            }
        }
    }

    private bind<Type extends keyof TypeMap>(
        binding: IEntityBinding<TypeMap, Type>,
        options?: TBindingOptions,
    ): void {
        const isConflict = this._bindings
            .some(it => it.type === binding.type && it.name === binding.name)

        if (isConflict) {
            const conflictResolution = options?.conflict ?? 'bind'
            if (conflictResolution == 'throw') {
                throw DIError.bindingConflict(binding.type, binding.name)
            } else if (conflictResolution == 'skip') {
                return
            } else if (conflictResolution === 'bind') {
                if (binding.lifecycle !== Lifecycle.Singleton)
                    throw DIError.invalidMultiBinding(binding.type, binding.name, binding.lifecycle)
            } else if (conflictResolution == 'override') {
                const currentBindingIndex = this._bindings.findIndex(it => it.type === binding.type && it.name === binding.name)
                if (currentBindingIndex >= 0) {
                    this._bindings[currentBindingIndex] = binding
                    return
                }
            }
        }
        this._bindings.push(binding)
    }
}


export type TypeMapOfContainer<TContainer> = TContainer extends DIContainer<infer TypeMap> ? TypeMap : never
/**
 * Module definition function
 * @param TypeMap - Type map provided by the module
 * @param DependencyTypeMap - TypeMap that the module depends on
 * @param builder - Reference of builder
 */
export type DIModuleFunction<TypeMap extends object, DependencyTypeMap extends object> = (
    builder: IDIModuleBuilder<TypeMap & DependencyTypeMap>,
) => void

/**
 * Utility type. Retrieves a TypeMap type from a module type
 * @see DIModuleFunction
 */
export type TypeMapOfModule<Module> = Module extends DIModuleFunction<infer TypeMap, any> ? TypeMap : never

/**
 * Module definition function
 */
export const createDIModule = <TypeMap extends object, DependencyTypeMap extends object = {}>(
    moduleFunc: DIModuleFunction<TypeMap, DependencyTypeMap>,
) => moduleFunc;
