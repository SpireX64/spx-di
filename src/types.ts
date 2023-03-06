import IDependencyResolver from './abstract/IDependencyResolver'
import IEntityBinding from './abstract/IEntityBinding'
import { DIContainerBuilder } from './DIContainer'

export type TInstanceFactory<TypeMap extends object, Type extends keyof TypeMap> =
    (resolver: IDependencyResolver<TypeMap>) => TypeMap[Type]

export type TScopeKey = string | Symbol
export type TBindingName = string | Symbol | null
export type TBindingOptions = {
    name?: TBindingName,
    override?: boolean,
}

export type TBindingsList<TypeMap extends object> = IEntityBinding<TypeMap, keyof TypeMap>[]
export type TReadonlyBindingsList<TypeMap extends object> = readonly IEntityBinding<TypeMap, keyof TypeMap>[]

export type TProvider<Type> = () => Type

export type DIModuleFunction<TypeMap extends object, DependencyTypeMap extends object> = (
    resolver: DIContainerBuilder<TypeMap & DependencyTypeMap>,
) => void

export type TypeMapOfModule<Module> = Module extends DIModuleFunction<infer TypeMap, any> ? TypeMap : never

export interface IDisposable {
    dispose(): void
}