import Lifecycle from '../Lifecycle'
import ITypeBinding from '../abstract/ITypeBinding'
import IDependencyResolver from '../abstract/IDependencyResolver'
import { DIError } from '../DIError'
import IBindingsRepository, { TBindingsFilterPredicate } from '../abstract/IBindingsRepository'

export default class InstanceActivator<TypeMap extends object> implements IBindingsRepository<TypeMap>{
    private readonly _repository: IBindingsRepository<TypeMap>
    private _activationChain: ITypeBinding<TypeMap, keyof TypeMap>[] = []

    public constructor(repository: IBindingsRepository<TypeMap>) {
        this._repository = repository
    }

    // region: IBindingsRepository implementation

    public find<Type extends keyof TypeMap>(type: Type, predicate?: TBindingsFilterPredicate<TypeMap, Type>): ITypeBinding<TypeMap, Type> | null {
        return this._repository.find(type, predicate)
    }

    public findAllOf<Type extends keyof TypeMap>(type: Type, predicate?: TBindingsFilterPredicate<TypeMap, Type>): readonly ITypeBinding<TypeMap, Type>[] {
        return this._repository.findAllOf(type, predicate)
    }

    public getAllBindings(): readonly ITypeBinding<TypeMap, keyof TypeMap>[] {
        return this._repository.getAllBindings()
    }

    // endregion: IBindingsRepository implementation

    /**
     * Activate instance of type by {@link binding}
     * @param resolver - Dependencies resolver
     * @param binding - Type binding
     * @returns activated instance
     */
    public activate<Type extends keyof TypeMap>(
        resolver: IDependencyResolver<TypeMap>,
        binding: ITypeBinding<TypeMap, Type>,
    ): TypeMap[Type] {
        if (binding.instance != null)
            return binding.instance

        if (binding.factory != null) {
            const hasDependencyCycle = this._activationChain.some(prevBinding => prevBinding === binding)
            this._activationChain.push(binding)
            if (hasDependencyCycle) {
                const currentChain = this._activationChain
                this._activationChain = []
                throw DIError.dependencyCycle(currentChain)
            }
            const instance = binding.factory(resolver)
            this._activationChain.pop()
            return instance
        }

        throw DIError.nullableBinding(binding.type, binding.name)
    }

    /**
     * Activate all instances with singleton lifecycle
     * @param resolver - Dependencies resolver
     * @returns map of activated singletons
     */
    public activateSingletons(
        resolver: IDependencyResolver<TypeMap>,
    ): ReadonlyMap<ITypeBinding<TypeMap, keyof TypeMap>, TypeMap[keyof TypeMap]> {
        const activatedInstancesMap = new Map<ITypeBinding<TypeMap, keyof TypeMap>, TypeMap[keyof TypeMap]>()
        this.getAllBindings()
            .filter(it => it.lifecycle === Lifecycle.Singleton && it.instance == null)
            .forEach(binding => {
                const instance = this.activate(resolver, binding)
                activatedInstancesMap.set(binding, instance)
            })
        return activatedInstancesMap
    }
}
