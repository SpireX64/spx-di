import { TProvider } from '../types'

interface IPhantom<TypeMap extends object, Type extends keyof TypeMap> {
    type: Type
    ref: TypeMap[Type] | null,
    provider: TProvider<TypeMap[Type]>,
}

function getTargetForProxy<TypeMap extends object, Type extends keyof TypeMap>(lazy: IPhantom<TypeMap, Type>): TypeMap[Type] {
    if (lazy.ref == null) {
        lazy.ref = lazy.provider()
    }
    return lazy.ref
}

/**
 * Checks that given object is phantom instance
 * @param obj - instance to check
 */
export function isPhantomInstance(obj: unknown): boolean {
    // @ts-ignore
    return obj != null && Boolean(obj.isPhantomInstance)
}

/**
 * Create phantom instance by provider
 * @param type - Access key of type
 * @param provider - Instance provider function
 * @returns phantom instance of type
 */
export function createPhantomInstance<TypeMap extends object, Type extends keyof TypeMap>(
    type: Type,
    provider: TProvider<TypeMap[Type]>,
): TypeMap[Type] {
    const phantom: IPhantom<TypeMap, Type> = {
        type,
        provider,
        ref: null
    }
    const proxy = new Proxy(phantom, {
        get(lazy: IPhantom<TypeMap, Type>, property: string | symbol): any {
            if (property === 'isPhantomInstance') return true
            const target = getTargetForProxy(lazy)
            // @ts-ignore
            return property in target ? target[property] : undefined
        },
        set(lazy: IPhantom<TypeMap, Type>, property: string | symbol, newValue: any): boolean {
            const target = getTargetForProxy(lazy)
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
