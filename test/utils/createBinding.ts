import ITypeBinding from '../../src/abstract/ITypeBinding'
import { Lifecycle } from '../../src'

export default function createBinding<TypeMap extends object, Type extends keyof TypeMap>(
    type: Type,
    binding?: Partial<ITypeBinding<TypeMap, Type>>
): ITypeBinding<TypeMap, Type> {
    return {
        type: binding?.type ?? type,
        name: binding?.name ?? null,
        scope: binding?.scope ?? null,
        instance: binding?.instance ?? null,
        factory: binding?.factory ?? null,
        lifecycle: binding?.lifecycle ?? Lifecycle.Singleton,
    }
}
