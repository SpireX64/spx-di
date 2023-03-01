import IEntityBinding from './IEntityBinding'
import { TInstanceFactory } from './types'
import DIError from './errors/DIError'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import NullableBindingDIError from './errors/NullableBindingDIError'

export default class DIContainer<TypeMap extends object> {
    private readonly _bindingsMap: ReadonlyMap<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>

    public constructor(bindings: ReadonlyMap<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>) {
        this._bindingsMap = bindings
    }

    public get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        const binding = this._bindingsMap.get(type) as IEntityBinding<TypeMap, Type> | null
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        if (binding.instance != null)
            return binding.instance

        if (binding.factory != null)
            return binding.factory()

        throw new DIError(`Unexpected nullable binding`)
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
        return new DIContainer(this._bindingsMap)
    }

    private bind<Type extends keyof TypeMap>(type: Type, binding: IEntityBinding<TypeMap, Type>): void {
        this._bindingsMap.set(type, binding)
    }
}