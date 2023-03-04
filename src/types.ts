import IDependencyResolver from './IDepencencyResolver'

export type TInstanceFactory<TypeMap extends object, Type extends keyof TypeMap> =
    (resolver: IDependencyResolver<TypeMap>) => TypeMap[Type]

export enum Lifecycle {
    Singleton = 'Singleton',
    LazySingleton = 'LazySingleton',
    Transient = 'Transient',
}
