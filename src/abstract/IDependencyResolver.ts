import { IScopeDisposable, TBindingName, TProvider } from '../types'

export default interface IDependencyResolver<TypeMap extends object> {
    /**
     * Request an instance of the given {@link type}.
     * @param type - the type of required instance
     * @param name - (opt.) instance name, to request instance type by name
     * @returns instance of requested type
     * @throws BindingNotFoundDIError if instance cannot be resolved
     */
    get<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type]

    /**
     * Try to request an instance of the given {@link type}.
     * @param type - the type of required instance
     * @param name - (opt.) instance name, to request instance type by name
     * @returns instance of requested type or undefined
     */
    getOptional<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type] | undefined

    /**
     * Request all bound instances of given {@link type}.
     * @param type the type of required instances
     * @param name - (opt.) instance name, to request instances type by name
     * @returns instances list of requested type
     */
    getAll<Type extends keyof TypeMap>(type: Type, name?: TBindingName): ReadonlyArray<TypeMap[Type]>

    /**
     * Request provider function of instance with given {@see type}.
     * This will help defer the instance request until it is used.
     * @param type - the type of required instance
     * @param name - (opt.) instance name, to request instance type by name
     * @returns instance provider function of given type
     */
    getProvider<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TProvider<TypeMap[Type]>

    /**
     * Returns phantom instance of requested {@link type}.
     * If instance was activated, returns real instance of given type.
     * Or else, returns phantom instance, that will activate real instance after first interaction with it.
     * @param type - the type of required instance
     * @param name - (opt.) instance name, to request instance type by name
     * @returns instance or phantom-instance of given type
     */
    getPhantom<Type extends keyof TypeMap>(type: Type, name?: TBindingName): TypeMap[Type]

    /** Request disposable of scope */
    getScopeDisposable(): IScopeDisposable
}