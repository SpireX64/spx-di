import { Lifecycle, TBindingName, TProvider, TScopeKey } from './types'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import ClosedScopeDIError from './errors/ClosedScopeDIError'
import IEntityBinding from "./IEntityBinding";
import { createLazyInstance } from './ILazyInstance'

export default class DIScope<TypeMap extends object> implements IDependencyResolver<TypeMap> {
    private readonly _activator: EntityActivator<TypeMap>
    private readonly _parent: DIScope<TypeMap> | null
    private readonly _scopedInstancesMap = new Map<
        keyof TypeMap,
        Map<TBindingName, TypeMap[keyof TypeMap][]>
    >()
    private _isClosed = false

    public constructor(
        public readonly key: TScopeKey,
        activator: EntityActivator<TypeMap>,
        parentScope: DIScope<TypeMap> | null = null,
    ) {
        this._activator = activator
        this._parent = parentScope
        if (parentScope == null) {
            // Activate singletons for root scope
            this.activateSingletons()
        }
    }

    public get isClosed(): boolean {
        return this._isClosed
    }

    private getActivatedInstance<Type extends keyof TypeMap>(
        binding: IEntityBinding<TypeMap, Type>,
        allowInheritedGet: boolean,
    ): TypeMap[Type] | null {
        if (binding.instance != null)
            return binding.instance

        let instance: TypeMap[Type] | undefined
        if (allowInheritedGet) {
            instance = this._parent?.get(binding.type, binding.name)
            if (instance != null)
                return instance as TypeMap[Type]
        }

        const typeGroup = this._scopedInstancesMap.get(binding.type)
        if (!typeGroup) return null

        const instances = typeGroup.get(binding.name)
        if (!instances || instances.length == 0) return null

        return instances[0] as TypeMap[Type]
    }

    public get<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        if (this._isClosed)
            throw new ClosedScopeDIError(this.key)

        const binding = this._activator.findBindingOf(type, name)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        const isSingleton = binding.lifecycle === Lifecycle.Singleton
            || binding.lifecycle === Lifecycle.LazySingleton
        let instance = this.getActivatedInstance(binding, isSingleton)
        if (instance != null)
            return instance

        instance = this._activator.activate(this, binding)
        if (binding.lifecycle !== Lifecycle.Transient) {
            this.pushInstance(binding, instance)
        }
        return instance
    }

    public getAll<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): ReadonlyArray<TypeMap[Type]> {
        if (this._isClosed)
            throw new ClosedScopeDIError(this.key)

        if (this._parent != null)
            return this._parent.getAll(type, name)

        const bindings = this._activator.findAllBindingsOf(type, name)
        if (bindings.length === 0) return []
        if (bindings.length === 1) {
            return Array.of(this.get(type, name))
        }

        const instances = bindings.filter(it => it != null).map(it => it.instance) as TypeMap[Type][]
        const activatedInstances = (this._scopedInstancesMap.get(type)?.get(name) ?? []) as TypeMap[Type][]
        return instances.concat(activatedInstances)
    }

    public getProvider<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TProvider<TypeMap[Type]> {
        const scope = this

        function provider() {
            if (scope.isClosed)
                throw new ClosedScopeDIError(scope.key)
            return scope.get(type, name)
        }

        const providerName = `provide_${type.toString()}_${scope.key.toString()}`
        Object.defineProperty(provider, 'name', {value: providerName})
        return provider
    }

    public getLazy<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        const binding = this._activator.findBindingOf(type, name)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        const instance = this.getActivatedInstance(
            binding,
            binding.lifecycle === Lifecycle.Singleton,
        )
        if (instance != null)
            return instance

        // Instance was not activated, building lazy-instance
        return createLazyInstance(binding.type, this.getProvider(type))
    }

    public close() {
        this._isClosed = true
        this._scopedInstancesMap.clear()
    }

    private pushInstance<Type extends keyof TypeMap>(
        binding: IEntityBinding<TypeMap, Type>,
        instance: TypeMap[Type],
    ): void {
        let typeGroup = this._scopedInstancesMap.get(binding.type)
        let instancesList: TypeMap[Type][]
        if (typeGroup == null) {
            typeGroup = new Map()
            instancesList = []
            typeGroup.set(binding.name, instancesList)
            this._scopedInstancesMap.set(binding.type, typeGroup)

        } else {
            const list = typeGroup.get(binding.name)
            if (list == null) {
                instancesList = []
                typeGroup.set(binding.name, instancesList)
            } else {
                instancesList = list as TypeMap[Type][]
            }
        }
        instancesList.push(instance)
    }

    private activateSingletons(): void {
        this._activator.activateSingletons(this)
            .forEach((instance, binding) => {
                this.pushInstance(binding, instance)
            })
    }
}