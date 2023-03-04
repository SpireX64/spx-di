import IEntityBinding from './IEntityBinding'
import IDependencyResolver from './IDepencencyResolver'
import NullableBindingDIError from './errors/NullableBindingDIError'
import DependencyCycleDIError from './errors/DependencyCycleDIError'
import {Lifecycle, TBindingName, TReadonlyBindingsList} from './types'

export default class EntityActivator<TypeMap extends object> {
    private readonly _bindings: TReadonlyBindingsList<TypeMap>
    private _activationChain: IEntityBinding<TypeMap, keyof TypeMap>[] = []

    public constructor(bindings: TReadonlyBindingsList<TypeMap>) {
        this._bindings = bindings
    }

    public findBindingOf<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): IEntityBinding<TypeMap, Type> | null {
        const binding = this._bindings.find(it => it.type === type && it.name == name)
        if (!binding) return null
        return binding as IEntityBinding<TypeMap, Type>
    }

    public findAllBindingsOf<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): ReadonlyArray<IEntityBinding<TypeMap, Type>> {
        const bindings = this._bindings.filter(it => it.type === type && it.name == name)
        // @ts-ignore
        return bindings as ReadonlyArray<IEntityBinding<TypeMap, Type>>
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

    public activateSingletons(
        resolver: IDependencyResolver<TypeMap>,
    ): ReadonlyMap<IEntityBinding<TypeMap, keyof TypeMap>, TypeMap[keyof TypeMap]> {
        const activatedInstancesMap = new Map<IEntityBinding<TypeMap, keyof TypeMap>, TypeMap[keyof TypeMap]>()
        this._bindings
            .filter(binding => binding.lifecycle === Lifecycle.Singleton && binding.instance == null)
            .forEach(binding => {
                const instance = this.activate(resolver, binding)
                activatedInstancesMap.set(binding, instance)
            })
        return activatedInstancesMap
    }
}
