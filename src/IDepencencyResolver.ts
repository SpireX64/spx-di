import { TProvider } from './types'

export default interface IDependencyResolver<TypeMap extends object> {
    get<Type extends keyof TypeMap>(type: Type): TypeMap[Type]
    getProvider<Type extends keyof TypeMap>(type: Type): TProvider<TypeMap[Type]>
    getLazy<Type extends keyof TypeMap>(type: Type): TypeMap[Type]
}