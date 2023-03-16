import IEntityBinding, { getStringName } from './abstract/IEntityBinding'
import MultiBindingDIError from './errors/MultiBindingDIError'
import NullableBindingDIError from './errors/NullableBindingDIError'
import BindingConflictDIError from './errors/BindingConflictDIError'
import IDependencyResolver from './abstract/IDependencyResolver'
import EntityActivator from './internal/EntityActivator'
import DIScope from './internal/DIScope'
import Lifecycle from './Lifecycle'
import type {
    DIModuleFunction,
    TBindingName,
    TBindingOptions,
    TBindingsList,
    TInstanceFactory,
    TProvider,
    TScopeKey,
} from './types'
import { TRequiredTypeToken } from './types'
import { RequiredBindingNotProvidedDIError } from './errors'

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

    public scope(key: TScopeKey): IDependencyResolver<TypeMap> {
        let scope: DIScope<TypeMap> | undefined = this._scopes.get(key)
        if (scope != null && scope) {
            if (!scope.isClosed())
                return scope
        }

        scope = new DIScope(key, this._activator, this._globalScope)
        this._scopes.set(key, scope)
        return scope
    }

    public closeScope(key: TScopeKey): void {
        if (key === DIContainer.globalScopeKey) return
        const scope = this._scopes.get(key)
        if (!scope) return
        this._scopes.delete(key)
        scope.close()
    }

    public static builder<TypeMap extends object = {}>(){
        return new DIContainerBuilder<TypeMap>()
    }
}
export interface IConditionalBinder<TypeMap extends object> {
    bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap>

    bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle?: Lifecycle,
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap>
}

export interface IDIConfiguration<TypeMap extends object> {
    /**
     * Checks is module was added
     * @param module - module definition
     * @returns true, when module already added to container
     */
    hasModule(module: DIModuleFunction<any, any>): boolean

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

export class DIContainerBuilder<TypeMap extends object> implements IDIConfiguration<TypeMap> {
    private readonly _bindings: TBindingsList<TypeMap> = []
    private readonly _requiredTypes: TRequiredTypeToken<TypeMap, keyof TypeMap>[] = []
    private readonly _modules: DIModuleFunction<any, any>[] = []

    /**
     * Conditional binding.
     * When param {@link condition} is false, skip next binding call.
     * @param condition - binding condition
     */
    public when(condition: boolean | ((builder: IDIConfiguration<TypeMap>) => boolean)): IConditionalBinder<TypeMap> {
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

    /**
     * Bind type with instance/value
     * @param type Access key of the type
     * @param instance instance of type to bind
     * @param options - (opt.) Extra binding options
     */
    public bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw new NullableBindingDIError(getStringName(type))
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

    /**
     * Bind type with factory function
     * @param type - Access key of the type
     * @param factory - Factory function
     * @param lifecycle - (opt.) Activated instance lifecycle (default = Singleton)
     * @param options - (opt.) Extra binding options
     */
    public bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle = Lifecycle.Singleton,
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw new NullableBindingDIError(getStringName(type))
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

    /**
     * Requiring Type Binding in Configuration.
     * Throws error if required binding not provided
     * @param type - Key of required type
     * @param options - Additional options
     */
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
        module(this)
        this._modules.push(module)
        // @ts-ignore
        return this as DIContainerBuilder<TypeMap & ModuleTypeMap>
    }

    public hasModule(module: DIModuleFunction<any, any>): boolean {
        return this._modules.includes(module)
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
                throw new RequiredBindingNotProvidedDIError(token.type, token.name, token.scope)
            if (token.scope != null) {
                const availableInScope = typeBindings.some(({ scope }) =>
                    scope == null || (Array.isArray(scope) ? scope?.includes(token.scope!) : scope === token.scope)
                )
                if (!availableInScope)
                    throw new RequiredBindingNotProvidedDIError(token.type, token.name, token.scope)
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
                throw new BindingConflictDIError(binding.type, binding.name)
            } else if (conflictResolution == 'skip') {
                return
            } else if (conflictResolution === 'bind') {
                if (binding.lifecycle !== Lifecycle.Singleton)
                    throw new MultiBindingDIError(
                        binding.type,
                        binding.name,
                        binding.lifecycle,
                    )
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
 */
export const createDIModule = <TypeMap extends object, DependencyTypeMap extends object = {}>(
    moduleFunc: DIModuleFunction<TypeMap, DependencyTypeMap>,
) => moduleFunc;
