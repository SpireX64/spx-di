import Lifecycle from '../Lifecycle'
import {
    IDisposable,
    IScopeDisposable,
    TBindingName,
    TProvider,
    TScopeKey,
} from '../types'
import IDependencyResolver from '../abstract/IDependencyResolver'
import InstanceActivator from './InstanceActivator'
import ITypeBinding, { checkIsAvailableInScope } from '../abstract/ITypeBinding'
import { createPhantomInstance } from './PhantomInstance'
import DIError from '../DIError'

export default class DIScope<TypeMap extends object>
    implements IDependencyResolver<TypeMap>, IDisposable {

    private readonly _activator: InstanceActivator<TypeMap>
    private readonly _parent: DIScope<TypeMap> | null
    private readonly _scopedInstancesMap = new Map<
        keyof TypeMap,
        Map<TBindingName, TypeMap[keyof TypeMap][]>
    >()
    private _isDisposed = false

    public constructor(
        public readonly key: TScopeKey,
        activator: InstanceActivator<TypeMap>,
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
    public isDisposed(): boolean {
        return this._isDisposed
    }

    /**
     * Returns activated instance from cache
     * @param binding - Entity binding
     * @param allowInheritedGet - Allows get instances from parent scope cache
     * @private
     */
    private getActivatedInstance<Type extends keyof TypeMap>(
        binding: ITypeBinding<TypeMap, Type>,
        allowInheritedGet: boolean,
    ): TypeMap[Type] | null {
        if (binding.instance != null)
            return binding.instance

        let instance: TypeMap[Type] | undefined
        if (this._parent && allowInheritedGet) {
            instance = this._parent.resolveInstanceByBinding(binding)
            if (instance != null)
                return instance as TypeMap[Type]
        }

        const typeGroup = this._scopedInstancesMap.get(binding.type)
        if (!typeGroup) return null
        const instances = typeGroup.get(binding.name)!
        return instances[0] as TypeMap[Type]
    }

    public get<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        if (this._isDisposed)
            throw DIError.illegalClosedScopeAccess(this.key)

        const binding = this._activator.find(type, it => it.name == name && checkIsAvailableInScope(it.scope, this.key))
        if (binding == null)
            throw DIError.bindingNotFound(type, name, this.key)

        return this.resolveInstanceByBinding(binding)
    }

    public getOptional<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type] | undefined {
        if (this._isDisposed)
            throw DIError.illegalClosedScopeAccess(this.key)

        const binding = this._activator.find(type, it => it.name == name && checkIsAvailableInScope(it.scope, this.key))
        if (binding == null)
            return undefined

        return this.resolveInstanceByBinding(binding)
    }

    private resolveInstanceByBinding<Type extends keyof TypeMap>(binding: ITypeBinding<TypeMap, Type>): TypeMap[Type] {
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
        if (this._isDisposed)
            throw DIError.illegalClosedScopeAccess(this.key)

        if (this._parent != null)
            return this._parent.getAll(type, name)

        const bindings = this._activator.findAllOf(type, it => it.name == name && checkIsAvailableInScope(it.scope, this.key))
        if (bindings.length === 0) return []
        const instances = bindings.filter(it => it.instance != null).map(it => it.instance) as TypeMap[Type][]
        const activatedInstances = (this._scopedInstancesMap.get(type)?.get(name) ?? []) as TypeMap[Type][]
        return instances.concat(activatedInstances)
    }

    public getProvider<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TProvider<TypeMap[Type]> {
        if (this._isDisposed)
            throw DIError.illegalClosedScopeAccess(this.key)

        const scope = this
        function provider() {
            if (scope.isDisposed())
                throw DIError.illegalClosedScopeAccess(scope.key)
            return scope.get(type, name)
        }

        const providerName = `provide_${type.toString()}_${scope.key.toString()}`
        Object.defineProperty(provider, 'name', {value: providerName})
        return provider
    }

    public getPhantom<Type extends keyof TypeMap>(type: Type, name: TBindingName = null): TypeMap[Type] {
        if (this._isDisposed)
            throw DIError.illegalClosedScopeAccess(this.key)

        const binding = this._activator.find(type, it => it.name == name && checkIsAvailableInScope(it.scope, this.key))
        if (binding == null)
            throw DIError.bindingNotFound(type, name, this.key)

        const instance = this.getActivatedInstance(
            binding,
            binding.lifecycle === Lifecycle.Singleton,
        )
        if (instance != null)
            return instance

        // Instance was not activated, building lazy-instance
        return createPhantomInstance(binding.type, this.getProvider(type))
    }

    public getScopeDisposable(): IScopeDisposable {
        return {
            scopeKey: this.key,
            isScopeDisposed: () => this.isDisposed(),
            dispose: () => this.dispose()
        }
    }

    /** Close this scope and dispose its instances */
    public dispose() {
        if (this._isDisposed || this._parent == null) return
        this._isDisposed = true
        this.disposeScopedInstances()
        this._scopedInstancesMap.clear()
    }

    private pushInstance<Type extends keyof TypeMap>(
        binding: ITypeBinding<TypeMap, Type>,
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