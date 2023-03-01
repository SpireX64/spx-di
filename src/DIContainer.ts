import IEntityBinding from './IEntityBinding'
import { Lifecycle, TInstanceFactory } from './types'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import NullableBindingDIError from './errors/NullableBindingDIError'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'

export default class DIContainer<TypeMap extends object> implements IDependencyResolver<TypeMap> {
    private readonly _activator: EntityActivator<TypeMap>
    private readonly _singletonsMap = new Map<keyof TypeMap, TypeMap[keyof TypeMap]>()

    public constructor(activator: EntityActivator<TypeMap>) {
        this._activator = activator
    }

    public get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        const binding = this._activator.findBinding(type)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        if (binding.instance != null)
            return binding.instance

        if (binding.lifecycle === Lifecycle.SINGLETON) {
            const instance = this._singletonsMap.get(type)
            if (instance != null)
                return instance as TypeMap[Type]
        }

        const activatedInstance = this._activator.activate(this, binding)
        if (binding.lifecycle === Lifecycle.SINGLETON) {
            this._singletonsMap.set(type, activatedInstance)
        }
        return activatedInstance
    }

    public static builder<TypeMap extends object>(){
        return new DIContainerBuilder<TypeMap>()
    }
}

export class DIContainerBuilder<TypeMap extends object> {
    private readonly _bindingsMap = new Map<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>()

    public bindInstance<Type extends keyof TypeMap>(type: Type, instance: TypeMap[Type]): DIContainerBuilder<TypeMap> {
        if (instance == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            lifecycle: Lifecycle.SINGLETON,
            instance,
            factory: null,
        }
        this.bind(type, binding)
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle = Lifecycle.SINGLETON,
    ): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            lifecycle,
            factory,
            instance: null,
        }
        this.bind(type, binding)
        return this
    }

    public getBindingOfType<Type extends keyof TypeMap>(type: Type): IEntityBinding<TypeMap, Type> | null {
        const binding = this._bindingsMap.get(type)
        if (!binding) return null
        return binding as IEntityBinding<TypeMap, Type>
    }

    public build(): DIContainer<TypeMap> {
        const activator = new EntityActivator(this._bindingsMap)
        return new DIContainer(activator)
    }

    private bind<Type extends keyof TypeMap>(type: Type, binding: IEntityBinding<TypeMap, Type>): void {
        this._bindingsMap.set(type, binding)
    }
}