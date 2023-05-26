import IBindingsRepository, { TBindingsFilterPredicate } from '../abstract/IBindingsRepository'
import ITypeBinding from '../abstract/ITypeBinding'
import {TConflictResolution} from '../types'
import { DIError } from '../DIError'
import Lifecycle from '../Lifecycle'

export default class BindingsRegistrar<TypeMap extends object> implements IBindingsRepository<TypeMap> {
    private readonly _bindings: ITypeBinding<TypeMap, keyof TypeMap>[] = []

    public register<Type extends keyof TypeMap>(
        binding: ITypeBinding<TypeMap, Type>,
        conflictResolution: TConflictResolution
    ): void {
        const conflictDetected = this._bindings
            .some(it =>
                it.type === binding.type &&
                it.name === binding.name &&
                (binding.scope == null || it.scope == binding.scope)
            )

        if (conflictDetected) {
            if (conflictResolution === 'skip') return

            if (conflictResolution === 'throw')
                throw DIError.bindingConflict(binding.type, binding.name)

            if (conflictResolution === 'bind' && binding.lifecycle !== Lifecycle.Singleton) {
                throw DIError.invalidMultiBinding(binding.type, binding.name, binding.lifecycle)
            }

            if (conflictResolution === 'override') {
                const currentBindingIndex = this._bindings.findIndex(it => it.type === binding.type && it.name === binding.name)
                if (currentBindingIndex >= 0) {
                    this._bindings[currentBindingIndex] = binding
                    return
                }
            }
        }

        this._bindings.push(binding)
    }

    // region: IBindingsRepository implementation

    public find<Type extends keyof TypeMap>(
        type: Type,
        predicate?: TBindingsFilterPredicate<TypeMap, Type>,
    ): ITypeBinding<TypeMap, Type> | null {
        return this._bindings.find(it =>
            it.type === type &&
            (predicate != null ? predicate(it as ITypeBinding<TypeMap, Type>) : it.name === null)
        ) as ITypeBinding<TypeMap, Type> ?? null
    }

    public findAllOf<Type extends keyof TypeMap>(
        type: Type,
        predicate?: TBindingsFilterPredicate<TypeMap, Type>,
    ): readonly ITypeBinding<TypeMap, Type>[] {
        return this._bindings.filter(it =>
            it.type === type &&
            (predicate != null ? predicate(it as ITypeBinding<TypeMap, Type>) : it.name === null)
        ) as ITypeBinding<TypeMap, Type>[]
    }

    public getAllBindings(): readonly ITypeBinding<TypeMap, keyof TypeMap>[] {
        return this._bindings;
    }

    // endregion: IBindingsRepository implementation
}
