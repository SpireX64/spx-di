import { TBindingName, TBindingOptions, TInstanceFactory, TScopeKey } from '../types'
import Lifecycle from '../Lifecycle'

export type TBindingsFilter = {
    name?: TBindingName
    scope?: TScopeKey
}

export default interface IContainerConfigurator<TypeMap extends object> {
    bindInstance<Type extends keyof TypeMap>(
        type: Type,
        instance: TypeMap[Type],
        options?: TBindingOptions,
    ): IContainerConfigurator<TypeMap>

    bindFactory<Type extends keyof TypeMap>(
        type: Type,
        factory: TInstanceFactory<TypeMap, Type>,
        lifecycle?: Lifecycle,
        options?: TBindingOptions,
    ): IContainerConfigurator<TypeMap>

    requireType<Type extends keyof TypeMap>(type: Type, filter?: TBindingsFilter): IContainerConfigurator<TypeMap>

    when(condition: boolean): IContainerConfigurator<TypeMap>
}
