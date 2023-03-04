import { TBindingName, TProvider } from './types'

export default interface IDependencyResolver<TypeMap extends object> {
    get<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type]
    getAll<Type extends keyof TypeMap>(type: Type, name?: TBindingName): ReadonlyArray<TypeMap[Type]>
    getProvider<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TProvider<TypeMap[Type]>
    getLazy<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type]
}