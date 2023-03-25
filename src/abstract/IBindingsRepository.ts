import ITypeBinding from './ITypeBinding'

export type TBindingsFilterPredicate<TypeMap extends object, Type extends keyof TypeMap> = (binding: ITypeBinding<TypeMap, Type>) => boolean

export default interface IBindingsRepository<TypeMap extends object> {
    find<Type extends keyof TypeMap>(
        type: Type,
        predicate?: TBindingsFilterPredicate<TypeMap, Type>,
    ): ITypeBinding<TypeMap, Type> | null

    findAllOf<Type extends keyof TypeMap>(
        type: Type,
        predicate?: TBindingsFilterPredicate<TypeMap, Type>,
    ): readonly ITypeBinding<TypeMap, Type>[]

    getAllBindings(): readonly ITypeBinding<TypeMap, keyof TypeMap>[]
}
