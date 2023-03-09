import { TProvider } from '../types'

interface ILazy<TypeMap extends object, Type extends keyof TypeMap> {
    type: Type
    ref: TypeMap[Type] | null,
    provider: TProvider<TypeMap[Type]>,
}

function getTargetForLazyProxy<TypeMap extends object, Type extends keyof TypeMap>(lazy: ILazy<TypeMap, Type>): TypeMap[Type] {
    if (lazy.ref == null) {
        lazy.ref = lazy.provider()
    }
    return lazy.ref
}

/**
 * Checks that given object is lazy instance
 * @param obj - instance to check
 */
export function isLazyInstance(obj: unknown): boolean {
    // @ts-ignore
    return obj != null && Boolean(obj.isLazyInstance)
}

/**
 * Create lazy instance by provider
 * @param type - Access key of type
 * @param provider - Instance provider function
 * @returns lazy instance of type
 */
export function createLazyInstance<TypeMap extends object, Type extends keyof TypeMap>(
    type: Type,
    provider: TProvider<TypeMap[Type]>,
): TypeMap[Type] {
    const lazy: ILazy<TypeMap, Type> = {
        type,
        provider,
        ref: null
    }
    const proxy = new Proxy(lazy, {
        get(lazy: ILazy<TypeMap, Type>, property: string | symbol): any {
            if (property === 'isLazyInstance') return true
            const target = getTargetForLazyProxy(lazy)
            // @ts-ignore
            return property in target ? target[property] : undefined
        },
        set(lazy: ILazy<TypeMap, Type>, property: string | symbol, newValue: any): boolean {
            const target = getTargetForLazyProxy(lazy)
            // @ts-ignore
            if (property in target) {
                // @ts-ignore
                target[property] = newValue
                return true
            }
            return false
        },
    })
    return proxy as TypeMap[Type]
}