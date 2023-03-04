import { Lifecycle, TScopeKey } from './types'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import ClosedScopeDIError from './errors/ClosedScopeDIError'

export default class DIScope<TypeMap extends object> implements IDependencyResolver<TypeMap> {
    private readonly _activator: EntityActivator<TypeMap>
    private readonly _parent: DIScope<TypeMap> | null
    private readonly _scopedInstancesMap = new Map<keyof TypeMap, TypeMap[keyof TypeMap]>()
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

    public get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        if (this._isClosed)
            throw new ClosedScopeDIError(this.key)

        const binding = this._activator.findBinding(type)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        if (binding.instance != null)
            return binding.instance

        let instance: TypeMap[Type] | undefined

        const isSingleton = binding.lifecycle === Lifecycle.Singleton
            || binding.lifecycle === Lifecycle.LazySingleton
        if (isSingleton) {
            instance = this._parent?.get(type)
            if (instance != null)
                return instance as TypeMap[Type]
        }

        instance = this._scopedInstancesMap.get(type) as TypeMap[Type]
        if (instance != null)
            return instance

        instance = this._activator.activate(this, binding)
        if (binding.lifecycle !== Lifecycle.Transient) {
            this._scopedInstancesMap.set(type, instance)
        }
        return instance
    }

    public close() {
        this._isClosed = true
        this._scopedInstancesMap.clear()
    }

    private activateSingletons(): void {
        this._activator.activateSingletons(this)
            .forEach((instance, binding) => {
                this._scopedInstancesMap.set(binding.type, instance)
            })
    }
}