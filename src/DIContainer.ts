import ITypeBinding, { checkIsAvailableInScope } from './abstract/ITypeBinding'
import IDependencyResolver from './abstract/IDependencyResolver'
import InstanceActivator from './internal/InstanceActivator'
import DIScope from './internal/DIScope'
import DIError from './DIError'
import Lifecycle from './Lifecycle'
import type {
    IScopeDisposable,
    TBindingName,
    TBindingOptions,
    TInstanceFactory,
    TProvider,
    TScopeKey,
} from './types'
import {TRequiredTypeToken} from './types'
import BindingsRegistrar from './internal/BindingsRegistrar'
import IBindingsRepository, { TBindingsFilterPredicate } from './abstract/IBindingsRepository'
import IContainerConfigurator, { TBindingsFilter } from './abstract/IContainerConfigurator'
import ConditionalConfigurator from './internal/ConditionalConfigurator'

export default class DIContainer<TypeMap extends object> implements IDependencyResolver<TypeMap> {

    public static readonly globalScopeKey: TScopeKey = Symbol('global')
    private readonly _globalScope: DIScope<TypeMap>
    private readonly _activator: InstanceActivator<TypeMap>
    private readonly _scopes = new Map<TScopeKey, DIScope<TypeMap>>()

    public constructor(activator: InstanceActivator<TypeMap>) {
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
    findBindingOf<Type extends keyof TypeMap>(type: Type, name?: TBindingName): ITypeBinding<TypeMap, Type> | null

    /**
     * Returns all bindings entities of given {@link type}
     * @param type - Access key of type
     * @param name - (opt.) Instance name
     * @returns readonly list of bindings entities
     */
    getAllBindingsOf<Type extends keyof TypeMap>(type: Type, name?: TBindingName): readonly ITypeBinding<TypeMap, Type>[]
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

export class DIContainerBuilder<TypeMap extends object> implements IContainerConfigurator<TypeMap>, IBindingsRepository<TypeMap> {
    private readonly _registrar = new BindingsRegistrar<TypeMap>()
    private readonly _requiredTypes: TRequiredTypeToken<TypeMap, any>[] = []

    // region: IBindingsRepository implementation

    public find<Type extends keyof TypeMap>(type: Type, predicate?: TBindingsFilterPredicate<TypeMap, Type>): ITypeBinding<TypeMap, Type> | null {
        return this._registrar.find(type, predicate)
    }

    public findAllOf<Type extends keyof TypeMap>(type: Type, predicate?: TBindingsFilterPredicate<TypeMap, Type>): readonly ITypeBinding<TypeMap, Type>[] {
        return this._registrar.findAllOf(type, predicate)
    }

    public getAllBindings(): readonly ITypeBinding<TypeMap, keyof TypeMap>[] {
        return this._registrar.getAllBindings()
    }

    // endregion: IBindingsRepository implementation

    // region: IContainerConfigurator implementation
    public when(condition: boolean): IContainerConfigurator<TypeMap> {
        return new ConditionalConfigurator(this, condition)
    }

    public bindInstance<Type extends keyof TypeMap>(type: Type, instance: TypeMap[Type], options?: TBindingOptions): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw DIError.nullableBinding(type, options?.name ?? null)

        const binding: ITypeBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            scope: options?.scope ?? null,
            lifecycle: Lifecycle.Singleton,
            instance,
            factory: null,
        }

        this._registrar.register(binding, options?.conflict ?? 'bind')
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(type: Type, factory: TInstanceFactory<TypeMap, Type>, lifecycle?: Lifecycle, options?: TBindingOptions): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw DIError.nullableBinding(type, options?.name ?? null)

        const binding: ITypeBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            scope: options?.scope ?? null,
            lifecycle: lifecycle ?? Lifecycle.Singleton,
            factory,
            instance: null,
        }

        this._registrar.register(binding, options?.conflict ?? 'bind')
        return this
    }

    public requireType<Type extends keyof TypeMap>(type: Type, filter?: TBindingsFilter): DIContainerBuilder<TypeMap> {
        const token: TRequiredTypeToken<TypeMap, Type> = {
            type,
            filter,
        }
        this._requiredTypes.push(token)
        return this
    }

    // endregion: IContainerConfigurator implementation

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

    /**
     * Finalize configuration and build container.
     * All singleton instances will be activated.
     */
    public build(): DIContainer<TypeMap> {
        this.verifyRequiredTypes()
        const activator = new InstanceActivator(this._registrar)
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
            let typeBindings
            if (token.filter) {
                typeBindings = this.findAllOf(token.type, it => {
                    const name = token.filter?.name ?? null
                    if (it.name != name) return false
                    if (it.scope == null || token.filter?.scope == null) return true
                    return checkIsAvailableInScope(it.scope, token.filter.scope)
                })
            } else {
                typeBindings = this.findAllOf(token.type)
            }
            if (typeBindings.length === 0)
                throw DIError.missingRequiredType(token.type, token?.filter?.name ?? null, token.filter?.scope)
        }
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
