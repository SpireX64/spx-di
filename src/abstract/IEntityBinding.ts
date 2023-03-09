import Lifecycle from '../Lifecycle'
import type { TBindingName, TInstanceFactory } from '../types'

/**
 * Entity of type binding.
 * Provides information about how-to activate instance of type.
 */
export default interface IEntityBinding<TypeMap extends object, Type extends keyof TypeMap> {
    /** Type key */
    readonly type: Type

    /** Name of instance */
    readonly name: TBindingName,

    /** Activated instance lifecycle. */
    readonly lifecycle: Lifecycle

    /** Instance reference. */
    readonly instance: TypeMap[Type] | null

    /** Instance factory. */
    readonly factory: TInstanceFactory<TypeMap, Type> | null
}

/**
 * Stringify binding type name or instance name
 * @param name - name of type or instance
 */
export function getStringName(name: string | symbol | number | null): string {
    if (name == null) return '<default>'
    if (typeof name === 'string') return name
    if (typeof name === 'symbol') return name.description ?? name.toString()
    return name.toString()
}
