import IDependencyResolver from '../../src/abstract/IDependencyResolver'
import type {TProvider} from '../../lib'

export default function createResolverMock<TypeMap extends object>(): IDependencyResolver<TypeMap> {
    return {
        getAll<Type extends keyof TypeMap>(type: Type): ReadonlyArray<TypeMap[Type]> {
            throw new Error(`Stub!${type.toString()}`)
        },
        getLazy<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
            throw new Error(`Stub!${type.toString()}`)
        },
        getProvider<Type extends keyof TypeMap>(type: Type): TProvider<TypeMap[Type]> {
            throw new Error(`Stub!${type.toString()}`)
        },
        get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
            throw new Error(`Stub!${type.toString()}`)
        }
    }
}