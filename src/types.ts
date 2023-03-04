import IDependencyResolver from './IDepencencyResolver'

export type TInstanceFactory<TypeMap extends object, Type extends keyof TypeMap> =
    (resolver: IDependencyResolver<TypeMap>) => TypeMap[Type]

export type TScopeKey = string | Symbol

export enum Lifecycle {
    Singleton = 'Singleton',
    LazySingleton = 'LazySingleton',
    Scoped = 'Scoped',
    Transient = 'Transient',
}

export type TProvider<Type> = () => Type
