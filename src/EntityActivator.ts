import IEntityBinding from './IEntityBinding'
import IDependencyResolver from './IDepencencyResolver'
import NullableBindingDIError from './errors/NullableBindingDIError'

export default class EntityActivator<TypeMap extends object> {
    private readonly _bindings: ReadonlyMap<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>
    public constructor(bindings: ReadonlyMap<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>) {
        this._bindings = bindings
    }

    public findBinding<Type extends keyof TypeMap>(type: Type): IEntityBinding<TypeMap, Type> | null {
        const binding = this._bindings.get(type) as IEntityBinding<TypeMap, Type>
        return binding ?? null
    }

    public activate<Type extends keyof TypeMap>(
        resolver: IDependencyResolver<TypeMap>,
        binding: IEntityBinding<TypeMap, Type>,
    ): TypeMap[Type] {
        if (binding.instance != null)
            return binding.instance

        if (binding.factory != null)
            return binding.factory(resolver)

        throw new NullableBindingDIError(binding.type.toString())
    }
}
