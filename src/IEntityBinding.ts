export default interface IEntityBinding<TypeMap extends object, Type extends keyof TypeMap> {
    readonly type: Type
    readonly instance: TypeMap[Type]
}
