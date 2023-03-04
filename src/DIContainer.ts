import IEntityBinding from './IEntityBinding'
import NullableBindingDIError from './errors/NullableBindingDIError'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'
import DIScope from './DIScope'
import {
    Lifecycle,
    TBindingName,
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

    public getLazy<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        return this._globalScope.getLazy(type, name);
    }

    public getProvider<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TProvider<TypeMap[Type]> {
        return this._globalScope.getProvider(type, name)
    }

    public scope(key: TScopeKey): IDependencyResolver<TypeMap> {
        let scope: DIScope<TypeMap> | undefined = this._scopes.get(key)
        if (scope != null && scope) {
            if (!scope.isClosed)
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

    public static builder<TypeMap extends object>(){
        return new DIContainerBuilder<TypeMap>()
    }
}

export class DIContainerBuilder<TypeMap extends object> {
    private readonly _bindings: TBindingsList<TypeMap> = []

    public bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        name: TBindingName = null,
    ): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name,
            lifecycle: Lifecycle.Singleton,
            instance,
            factory: null,
        }
        this.bind(binding)
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle = Lifecycle.Singleton,
        name: TBindingName = null,
    ): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            name,
            lifecycle,
            factory,
            instance: null,
        }
        this.bind(binding)
        return this
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

    private bind<Type extends keyof TypeMap>(binding: IEntityBinding<TypeMap, Type>): void {
        this._bindings.push(binding)
    }
}
