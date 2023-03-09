import Lifecycle from '../Lifecycle'
import type { TBindingName, TInstanceFactory } from '../types'

export default interface IEntityBinding<TypeMap extends object, Type extends keyof TypeMap> {
    readonly type: Type
    readonly name: TBindingName,
    readonly lifecycle: Lifecycle
    readonly instance: TypeMap[Type] | null
    readonly factory: TInstanceFactory<TypeMap, Type> | null
}

export function getStringName(name: string | symbol | number | null): string {
    if (name == null) return '<default>'
    if (typeof name === 'string') return name
    if (typeof name === 'symbol') return name.description ?? name.toString()
    return name.toString()
}
