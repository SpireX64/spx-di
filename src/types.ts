export type TInstanceFactory<TypeMap extends object, Type extends keyof TypeMap> = () => TypeMap[Type]