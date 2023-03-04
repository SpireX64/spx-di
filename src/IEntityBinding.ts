import { Lifecycle, TBindingName, TInstanceFactory } from './types'

export default interface IEntityBinding<TypeMap extends object, Type extends keyof TypeMap> {
    readonly type: Type
    readonly name: TBindingName,
    readonly lifecycle: Lifecycle
    readonly instance?: TypeMap[Type] | null
    readonly factory?: TInstanceFactory<TypeMap, Type> | null
}
