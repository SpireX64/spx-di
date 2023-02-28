export default interface IDependencyResolver<TypeMap extends object> {
    get<Type extends keyof TypeMap>(type: Type): TypeMap[Type]
}