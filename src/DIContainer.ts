import IEntityBinding from './abstract/IEntityBinding'
import MultiBindingDIError from './errors/MultiBindingDIError'
import NullableBindingDIError from './errors/NullableBindingDIError'
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

export default class DIContainer<TypeMap extends object> implements IDependencyResolver<TypeMap> {
    public static globalScopeKey: TScopeKey = Symbol('global')
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

export class DIContainerBuilder<TypeMap extends object> {
    private readonly _bindings: TBindingsList<TypeMap> = []
    private readonly _modules: DIModuleFunction<any, any>[] = []

    public when(condition: boolean): IConditionalBinder<TypeMap> {
        const container = this
        return {
            bindInstance<Type extends keyof TypeMap>(
                type: Type,
                instance: TypeMap[Type],
                options?: TBindingOptions,
            ): DIContainerBuilder<TypeMap> {
                if (condition) container.bindInstance(type, instance, options)
                return container
            },
            bindFactory<Type extends keyof TypeMap>(
                type: Type,
                factory: TInstanceFactory<TypeMap, Type>,
                lifecycle?: Lifecycle,
                options?: TBindingOptions,
            ): DIContainerBuilder<TypeMap> {
                if (condition) container.bindFactory(type, factory, lifecycle, options)
                return container
            },
        }
    }

    public bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            lifecycle: Lifecycle.Singleton,
            instance,
            factory: null,
        }
        this.bind(binding, options?.override)
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle = Lifecycle.Singleton,
        options?: TBindingOptions,
    ): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name: options?.name ?? null,
            lifecycle,
            factory,
            instance: null,
        }
        this.bind(binding, options?.override)
        return this
    }

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

    public getAllBindingsOf<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): IEntityBinding<TypeMap, Type>[] {
        return this._bindings.filter(it => it.type === type && it.name === name) as IEntityBinding<TypeMap, Type>[]
    }

    public build(): DIContainer<TypeMap> {
        const activator = new EntityActivator(this._bindings)
        return new DIContainer(activator)
    }

    private bind<Type extends keyof TypeMap>(binding: IEntityBinding<TypeMap, Type>, override?: boolean): void {
        if (override) {
            const currentBindingIndex = this._bindings.findIndex(it => it.type === binding.type && it.name === binding.name)
            if (currentBindingIndex >= 0) {
                this._bindings[currentBindingIndex] = binding
                return
            }
        }

        if (binding.lifecycle !== Lifecycle.Singleton) {
            const wasBound = this._bindings
                .some(it => it.type === binding.type && it.name === binding.name)
            if (wasBound)
                throw new MultiBindingDIError(
                    binding.type.toString(),
                    binding.name,
                    binding.lifecycle,
                )
        }
        this._bindings.push(binding)
    }
}

export const createDIModule = <TypeMap extends object, DependencyTypeMap extends object = {}>(
    moduleFunc: DIModuleFunction<TypeMap, DependencyTypeMap>,
) => moduleFunc;
