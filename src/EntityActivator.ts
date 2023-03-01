import IEntityBinding from './IEntityBinding'
import IDependencyResolver from './IDepencencyResolver'
import NullableBindingDIError from './errors/NullableBindingDIError'
import DependencyCycleDIError from './errors/DependencyCycleDIError'

export default class EntityActivator<TypeMap extends object> {
    private readonly _bindings: ReadonlyMap<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>
    private _activationChain: IEntityBinding<TypeMap, keyof TypeMap>[] = []

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

        if (binding.factory != null) {
            const hasDependencyCycle = this._activationChain.some(prevBinding => prevBinding === binding)
            this._activationChain.push(binding)
            if (hasDependencyCycle) {
                const currentChain = this._activationChain
                this._activationChain = []
                throw new DependencyCycleDIError(currentChain)
            }
            const instance = binding.factory(resolver)
            this._activationChain.pop()
            return instance
        }

        throw new NullableBindingDIError(binding.type.toString())
    }
}
