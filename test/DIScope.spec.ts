import DIScope from '../src/internal/DIScope'
import InstanceActivator from "../src/internal/InstanceActivator";
import BindingsRegistrar from "../src/internal/BindingsRegistrar";
import createBinding from "./utils/createBinding";
import {DIError, DIErrorType, Lifecycle} from "../src";

describe('DIScope', function () {
    // WHEN: DIScope was created
    // THEN:
    //   - Scope has provided key
    //   - Scope is not disposed
    it('initial-state', () => {
        type TypeMap = { key: string }

        // Arrange
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)

        // Act -----------
        const scope = new DIScope(scopeKey, activator)

        // Assert --------
        expect(scope.key).toBe(scopeKey)
        expect(scope.isDisposed()).toBeFalsy()
    })

    // GIVEN: Registrar have singletons
    // WHEN: DIScope was created
    // THEN:
    it('activate-singletons', () => {
        type TypeMap = { key: symbol }
        const scopeKey = 'test'

        // Arrange ----------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { lifecycle: Lifecycle.Singleton, factory: () => Symbol() }), 'bind')
        registrar.register(createBinding('key', { lifecycle: Lifecycle.Singleton, factory: () => Symbol() }), 'bind')
        const activator = new InstanceActivator(registrar)

        // Act --------------
        const scope = new DIScope(scopeKey, activator)
        const singletons = scope.getAll('key')

        // Assert -----------
        expect(singletons).toHaveLength(2)
    })

    it('activate-singletons.no-pure-singletons', () => {
        type TypeMap = { key: symbol }
        const scopeKey = 'test'

        // Arrange ----------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { lifecycle: Lifecycle.LazySingleton, factory: () => Symbol() }), 'bind')
        const activator = new InstanceActivator(registrar)

        // Act --------------
        const scope = new DIScope(scopeKey, activator)
        const singletons = scope.getAll('key')

        // Assert -----------
        expect(singletons).toHaveLength(0)
    })

    // GIVEN:
    //   - Scope was created
    //   - Registrar has scoped type factory binding
    // WHEN: Get instance of type by scope
    // THEN: Instance will be created with a type factory
    it('get-scoped-instance.first-time', () => {
        type TypeMap = { key: string }
        const expectedValue = 'hello'
        const valueFactory = jest.fn(() => expectedValue)

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { factory: valueFactory }), 'bind')
        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)

        // Act -----------
        const value = scope.get('key')

        // Assert --------
        expect(value).toBe(expectedValue)
        expect(valueFactory).toHaveBeenCalledTimes(1)
        expect(valueFactory).toHaveBeenCalledWith(scope)
    })

    // GIVEN:
    //   - Scope was created
    //   - Registrar has scoped type factory binding
    //   - Scope has instance reference
    // WHEN: Get instance of type by scope
    // THEN:
    //   - Scope will return an exists instance
    //   - Factory will not to be called
    it('get-scoped-instance.next-time', () => {
        type TypeMap = { key: symbol }
        const valueFactory = jest.fn(() => Symbol())

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { factory: valueFactory }), 'bind')
        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)

        const firstInstance = scope.get('key')
        valueFactory.mockClear()

        // Act ----------
        const secondInstance = scope.get('key')

        // Assert -------
        expect(secondInstance).toBe(firstInstance)
        expect(valueFactory).not.toBeCalled()
    })

    // GIVEN:
    //   - Scope was created
    //   - Registrar have A and B bindings with same type
    // WHEN: Get instances of A and B
    // THEN: Scope will return different instances
    it('get-scoped-instance.with-different-name', () => {
        type TypeMap = { key: symbol }
        const valueFactory = jest.fn(() => Symbol())

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { name: 'A', factory: valueFactory }), 'bind')
        registrar.register(createBinding('key', { name: 'B', factory: valueFactory }), 'bind')

        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)

        // Act ----------
        const instanceA = scope.get('key', 'A')
        const instanceB = scope.get('key', 'B')

        // Assert -------
        expect(instanceA).not.toBe(instanceB)
    })

    it('get-scoped-instance.with-different-name.binding-not-found', () => {
        type TypeMap = { key: symbol }
        const valueFactory = jest.fn(() => Symbol())

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', {factory: valueFactory }), 'bind')

        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)
        const instance = scope.get('key')

        // Act ----------
        let error: DIError | null = null
        try {
            scope.get('key', 'B')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert -------
        expect(instance).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.BindingNotFound)
    })

    // GIVEN:
    //    - Scope was created
    //    - Registrar is empty
    // WHEN: Try to get instance
    // THEN: Throws 'Binding not found' error
    it('get-scoped-instance.binding-not-found', () => {
        type TypeMap = { key: symbol }

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)

        // Act ----------
        let error: DIError | null = null
        try {
            scope.get('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert -------
        expect(error?.errorType).toBe(DIErrorType.BindingNotFound)
    })

    // GIVEN:
    //    - Scope was created
    //    - Registrar is empty
    // WHEN: Try to get phantom instance
    // THEN: Throws 'Binding not found' error
    it('get-scoped-instance.phantom.binding-not-found', () => {
        type TypeMap = { key: symbol }

        // Arrange -------
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const scope = new DIScope('test', activator)

        // Act ----------
        let error: DIError | null = null
        try {
            scope.getLazy('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert -------
        expect(error?.errorType).toBe(DIErrorType.BindingNotFound)
    })

    // GIVEN:
    //    - Scope was created
    //    - Registrar is empty
    // WHEN: Get all instance of type
    // THEN: Returns an empty array
    it('get-all-instances.no-bindings', () => {
        type TypeMap = { key: string }

        // Arrange ---------
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope('test', activator)
        const scope = new DIScope('test', activator, rootScope)

        // Act -------------
        const instances = scope.getAll('key')

        // Assert ----------
        expect(instances).toHaveLength(0)
    })

    // GIVEN:
    //   - Scope was created
    //   - Some scoped instances was resolved by scope
    // WHEN: Dispose scope
    // THEN:
    //   - Scope become disposed
    //   - Dispose method of scoped instances was called
    it('dispose-scope', () => {
        const disposeInstanceCallback = jest.fn()
        const instance = {
            dispose: disposeInstanceCallback
        }
        type TypeMap = { key: typeof instance }

        // Arrange -----
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { lifecycle: Lifecycle.Scoped,  factory: () => instance }), 'bind')

        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)

        scope.get('key') // Push instance to scope

        // Act ---------
        scope.dispose()

        // Assert ------
        expect(scope.isDisposed()).toBeTruthy()
        expect(disposeInstanceCallback).toHaveBeenCalled()
    })

    // GIVEN:
    //   - Scope was created
    //   - Scope scoped instances resolved by scope
    //   - Scope become disposed
    // WHEN: Try to dispose scope again
    // THEN:
    //   - Scope still disposed
    //   - Dispose method of instances was not called
    it('dispose-scope.already-disposed', () => {
        const disposeInstanceCallback = jest.fn()
        const instance = { dispose: disposeInstanceCallback }
        type TypeMap = { key: typeof instance }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { lifecycle: Lifecycle.Scoped,  factory: () => instance }), 'bind')

        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)

        scope.get('key') // Push instance to scope
        scope.dispose()
        disposeInstanceCallback.mockClear()

        // Act ------------
        scope.dispose()

        // Assert ---------
        expect(scope.isDisposed()).toBeTruthy()
        expect(disposeInstanceCallback).not.toHaveBeenCalled()
    })

    // GIVEN:
    //   - Scope was created without parent
    // THEN: Try to dispose scope
    // THEN:
    //   - Scope not became disposed
    //   - Dispose method of instances was not called
    it('dispose-scope.without-parent', () => {
        const disposeInstanceCallback = jest.fn()
        const instance = { dispose: disposeInstanceCallback }
        type TypeMap = { key: typeof instance }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        registrar.register(createBinding('key', { lifecycle: Lifecycle.Scoped,  factory: () => instance }), 'bind')

        const activator = new InstanceActivator(registrar)
        const scope = new DIScope(scopeKey, activator)
        scope.get('key') // Push instance to scope

        // Act ------------
        scope.dispose()

        // Assert ---------
        expect(scope.isDisposed()).toBeFalsy()
        expect(disposeInstanceCallback).not.toHaveBeenCalled()
    })

    // GIVEN: Scope was created and disposed
    // WHEN: Try to get instance
    // THEN: Throws "Closed scope access" DIError
    it('dispose-scope.get-instance', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        scope.dispose()

        // Act -------------
        let error: DIError | null = null
        try {
            scope.get('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })

    // GIVEN: Scope was created and disposed
    // WHEN: Try to get all scoped instances
    // THEN: Throws "Closed scope access" DIError
    it('dispose-scope.get-all-instances', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        scope.dispose()

        // Act -------------
        let error: DIError | null = null
        try {
            scope.getAll('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })

    // GIVEN: Scope was created and disposed
    // WHEN: Try to get instance provider
    // THEN: Throws "Closed scope access" DIError
    it('dispose-scope.get-provider', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        scope.dispose()

        // Act -------------
        let error: DIError | null = null
        try {
            scope.getProvider('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })

    // GIVEN:
    //   - Scope was created
    //   - Instance provider was resolved
    // WHEN:
    //   - Dispose scope
    //   - Use resolved provider of disposed scope
    // THEN: Throws 'Illegal closed scope access' error
    it('dispose-scope.use-provider', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        const instanceProvider = scope.getProvider('key')

        // Act -------------
        scope.dispose()
        let error: DIError | null = null
        try {
            instanceProvider()
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })

    // GIVEN: Scope was created and disposed
    // WHEN: Try to get phantom instance
    // THEN: Throws "Closed scope access" DIError
    it('dispose-scope.get-phantom', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        scope.dispose()

        // Act -------------
        let error: DIError | null = null
        try {
            scope.getLazy('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })

    // GIVEN: Scope was created and disposed
    // WHEN: Try to get optional instance
    // THEN: Throws "Closed scope access" DIError
    it('dispose-scope.get-optional', () => {
        type TypeMap = { key: string }

        // Arrange --------
        const scopeKey = 'test'
        const registrar = new BindingsRegistrar<TypeMap>()
        const activator = new InstanceActivator(registrar)
        const rootScope = new DIScope(scopeKey, activator)
        const scope = new DIScope(scopeKey, activator, rootScope)
        scope.dispose()

        // Act -------------
        let error: DIError | null = null
        try {
            scope.getOptional('key')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ----------
        expect(scope.isDisposed()).toBeTruthy()
        expect(error?.errorType).toBe(DIErrorType.IllegalClosedScopeAccess)
    })
});