enum Lifecycle {
    /**
     * Singleton.
     *
     * Activated and available immediately after building the container.
     * Ensures that only one instance of the type exists in container.
     */
    Singleton = 'Singleton',

    /**
     * Lazy Singleton.
     *
     * Activated the first time an instance is requested.
     * Ensures that only one instance of the type exists in container.
     */
    LazySingleton = 'LazySingleton',

    /**
     * Scoped instance.
     *
     * Activated the first time an instance is requested.
     * Ensures that only one instance of the type exists per scope.
     */
    Scoped = 'Scoped',

    /**
     * Transient instance.
     *
     * A new instance is created per request.
     */
    Transient = 'Transient',
}

export default Lifecycle