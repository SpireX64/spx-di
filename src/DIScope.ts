import {Lifecycle, TProvider, TScopeKey} from './types'
import IDependencyResolver from './IDepencencyResolver'
import EntityActivator from './EntityActivator'
import BindingNotFoundDIError from './errors/BindingNotFoundDIError'
import ClosedScopeDIError from './errors/ClosedScopeDIError'
import IEntityBinding from "./IEntityBinding";

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

    private getActivatedInstance<Type extends keyof TypeMap>(
        binding: IEntityBinding<TypeMap, Type>,
        allowInheritedGet: boolean,
    ): TypeMap[Type] | null {
        if (binding.instance != null)
            return binding.instance

        let instance: TypeMap[Type] | undefined
        if (allowInheritedGet) {
            instance = this._parent?.get(binding.type)
            if (instance != null)
                return instance as TypeMap[Type]
        }

        return this._scopedInstancesMap.get(binding.type) as TypeMap[Type]
    }

    public get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        if (this._isClosed)
            throw new ClosedScopeDIError(this.key)

        const binding = this._activator.findBinding(type)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        const isSingleton = binding.lifecycle === Lifecycle.Singleton
            || binding.lifecycle === Lifecycle.LazySingleton
        let instance = this.getActivatedInstance(binding, isSingleton)
        if (instance != null)
            return instance

        instance = this._activator.activate(this, binding)
        if (binding.lifecycle !== Lifecycle.Transient) {
            this._scopedInstancesMap.set(type, instance)
        }
        return instance
    }

    public getProvider<Type extends keyof TypeMap>(type: Type): TProvider<TypeMap[Type]> {
        const scope = this

        function provider() {
            if (scope.isClosed)
                throw new ClosedScopeDIError(scope.key)
            return scope.get(type)
        }

        const providerName = `provide_${type.toString()}_${scope.key.toString()}`
        Object.defineProperty(provider, 'name', {value: providerName})
        return provider
    }

    public getLazy<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
        const binding = this._activator.findBinding(type)
        if (binding == null)
            throw new BindingNotFoundDIError(type.toString())

        const instance = this.getActivatedInstance(
            binding,
            binding.lifecycle === Lifecycle.Singleton,
        )
        if (instance != null)
            return instance

        // Instance was not activated, building lazy-instance
        let proxyState: {
            type: Type
            targetRef: TypeMap[Type] | null,
            provider: TProvider<TypeMap[Type]>,
        } = {
            type,
            provider: this.getProvider(type),
            targetRef: null,
        }

        const getTarget = (state: typeof proxyState) => {
            if (state.targetRef == null) {
                state.targetRef = state.provider()
            }
            return proxyState.targetRef
        }
        const proxy = new Proxy(proxyState, {
            get(state: typeof proxyState, p: string | symbol): any {
                const target = getTarget(state)
                // @ts-ignore
                return p in target ? target[p] as any : undefined
            },
            set(state: typeof proxyState, p: string | symbol, newValue: any): boolean {
                const target = getTarget(state)
                // @ts-ignore
                if (p in target) {
                    // @ts-ignore
                    target[p] = newValue
                    return true
                }
                return false
            }
        })
        return proxy as TypeMap[Type]
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