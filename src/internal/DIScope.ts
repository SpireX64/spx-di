import Lifecycle from '../Lifecycle'
import { TBindingName, TProvider, TScopeKey } from '../types'
import IDependencyResolver from '../abstract/IDependencyResolver'
import EntityActivator from './EntityActivator'
import BindingNotFoundDIError from '../errors/BindingNotFoundDIError'
import ClosedScopeDIError from '../errors/ClosedScopeDIError'
import IEntityBinding, { getStringName } from '../abstract/IEntityBinding'
import { createLazyInstance } from './LazyInstance'

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

    /** Checks is scope was closed */
    public isClosed(): boolean {
        return this._isClosed
    }

    /**
     * Returns activated instance from cache
     * @param binding - Entity binding
     * @param allowInheritedGet - Allows get instances from parent scope cache
     * @private
     */
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
            throw new BindingNotFoundDIError(getStringName(type))

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
            if (scope.isClosed())
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
            throw new BindingNotFoundDIError(getStringName(type))

        const instance = this.getActivatedInstance(
            binding,
            binding.lifecycle === Lifecycle.Singleton,
        )
        if (instance != null)
            return instance

        // Instance was not activated, building lazy-instance
        return createLazyInstance(binding.type, this.getProvider(type))
    }

    /** Close this scope and dispose its instances */
    public close() {
        if (this._isClosed) return
        this._isClosed = true
        this.disposeScopedInstances()
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

    private disposeScopedInstances(): void {
        this._scopedInstancesMap.forEach(typeGroup => {
            typeGroup.forEach(instances => {
                instances.forEach(instance => {
                    // @ts-ignore
                    if (typeof instance.dispose === 'function') {
                        // @ts-ignore
                        instance.dispose()
                    }
                })
            })
        })
    }
}