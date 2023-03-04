import IDependencyResolver from "../../src/IDepencencyResolver";

export default function createResolverMock<TypeMap extends object>(): IDependencyResolver<TypeMap> {
    return {
        get<Type extends keyof TypeMap>(type: Type): TypeMap[Type] {
            throw new Error('Stub!' + type.toString())
        }
    }
}