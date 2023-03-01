import IEntityBinding from './IEntityBinding'
import { TInstanceFactory } from './types'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import NullableBindingDIError from './errors/NullableBindingDIError'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'

export default class DIContainer<TypeMap extends object> implements IDependencyResolver<TypeMap> {
    private readonly _activator: EntityActivator<TypeMap>

    public constructor(activator: EntityActivator<TypeMap>) {
        this._activator = activator
    }

    public get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        const binding = this._activator.findBinding(type)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        return this._activator.activate(this, binding)
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
            instance,
            factory: null,
        }
        this.bind(type, binding)
        return this
    }

    public bindFactory<Type extends keyof TypeMap>(type: Type, factory: TInstanceFactory<TypeMap, Type>): DIContainerBuilder<TypeMap> {
        if (factory == null)
            throw new NullableBindingDIError(type.toString())
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
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