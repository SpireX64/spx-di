import { TInstanceFactory } from './types'

export default interface IEntityBinding<TypeMap extends object, Type extends keyof TypeMap> {
    readonly type: Type
    readonly instance: TypeMap[Type] | null
    readonly factory: TInstanceFactory<TypeMap, Type> | null
}
