import DIContainer from '../src/DIContainer'
import BindingNotFoundDIError from '../src/errors/BindingNotFoundDIError'
import { IDisposable, Lifecycle } from '../src/types'
import { isLazyInstance } from '../src/ILazyInstance'

describe('DIContainer', function () {
    it('Try get not bound value', () => {
        // Arrange -----
        const container = DIContainer.builder<{ value: number }>().build()
        let error: BindingNotFoundDIError | null = null

        // Act ---------
        try {
            container.get('value')
        } catch (err) {
            if (err instanceof BindingNotFoundDIError)
                error = err
        }

        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.type).toBe('value')
    })

    it('Get value by instance binding', () => {
        // Arrange -----
        const expectedValue = 42
        const container = DIContainer.builder<{ value: number }>()
            .bindInstance('value', expectedValue)
            .build()

        // Act ---------
        const value = container.get('value')

        // Assert ------
        expect(value).toBe(expectedValue)
    })

    it('Get value by binding singleton factory', () => {
        // Arrange -----
        const expectedValue = 42
        const factory = jest.fn(() => expectedValue)

        const builder = DIContainer.builder<{ value: number }>()
            .bindFactory('value', factory)

        // Act ---------
        const factoryCallsBeforeBuild = factory.mock.calls.length
        const container = builder.build()
        const factoryCallsAfterBuild = factory.mock.calls.length
        const value = container.get('value')
        const factoryCallsAfterGet = factory.mock.calls.length

        // Assert ------
        expect(value).toBe(expectedValue)
        expect(factoryCallsBeforeBuild).toBe(0)
        expect(factoryCallsAfterBuild).toBe(1)
        expect(factoryCallsAfterGet).toBe(1) // Instance was re-used
    })

    it('Get value by binding lazy singleton factory', () => {
        // Arrange -----
        const expectedValue = 42
        const factory = jest.fn(() => expectedValue)

        const builder = DIContainer.builder<{ value: number }>()
            .bindFactory('value', factory, Lifecycle.LazySingleton)

        // Act ---------
        const factoryCallsBeforeBuild = factory.mock.calls.length
        const container = builder.build()
        const factoryCallsAfterBuild = factory.mock.calls.length
        const value = container.get('value')
        const factoryCallsAfterGet = factory.mock.calls.length

        // Assert ------
        expect(value).toBe(expectedValue)
        expect(factoryCallsBeforeBuild).toBe(0)
        expect(factoryCallsAfterBuild).toBe(0)
        expect(factoryCallsAfterGet).toBe(1) // Instance was created on 'get'
    })

    it('Get value by factory with dependency', () => {
        // Arrange -----
        const originValue = 32
        const addendum = 10
        const expectedValue = originValue + addendum

        const factory = jest.fn(r => r.get('origin') + addendum)
        const container = DIContainer.builder<{
            origin: number,
            value: number,
        }>()
            .bindInstance('origin', originValue)
            .bindFactory('value', factory)
            .build()

        // Act --------
        const value = container.get('value')

        // Assert -----
        expect(value).toBe(expectedValue)
        expect(factory.mock.calls.length).toBe(1)
    })

    it('Transient lifecycle', () => {
        // Arrange -------
        const factory = jest.fn(() => new Object())

        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', factory, Lifecycle.Transient)
            .build()

        // Act -----------
        const object1 = container.get('typeKey')
        const object2 = container.get('typeKey')
        const object3 = container.get('typeKey')

        // Assert --------
        expect(factory.mock.calls.length).toBe(3)
        expect(object2).not.toBe(object1)
        expect(object3).not.toBe(object1)
    })

    it('Singleton lifecycle', () => {
        // Arrange -------
        const singletonFactory = jest.fn(() => new Object())

        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', singletonFactory)
            .build()

        // Act -----------
        const object1 = container.get('typeKey')
        const object2 = container.get('typeKey')
        const object3 = container.get('typeKey')

        // Assert --------
        expect(singletonFactory.mock.calls.length).toBe(1)
        expect(object2).toBe(object1)
        expect(object3).toBe(object1)
    })

    it('Lazy singleton lifecycle', () => {
        // Arrange -------
        const singletonFactory = jest.fn(() => new Object())

        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', singletonFactory, Lifecycle.LazySingleton)
            .build()

        // Act -----------
        const object1 = container.get('typeKey')
        const object2 = container.get('typeKey')
        const object3 = container.get('typeKey')

        // Assert --------
        expect(singletonFactory.mock.calls.length).toBe(1)
        expect(object2).toBe(object1)
        expect(object3).toBe(object1)
    })

    it('Scoped lifecycle', () => {
        // Arrange ---------
        const scopeA = 'A'
        const scopeB = 'B'
        const factory = jest.fn(() => new Object())

        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', factory, Lifecycle.Scoped)
            .build()

        // Act ---------------
        const objectA1 = container.scope(scopeA).get('typeKey')
        const objectA2 = container.scope(scopeA).get('typeKey')
        const objectB1 = container.scope(scopeB).get('typeKey')
        const objectB2 = container.scope(scopeB).get('typeKey')

        // Assert ------------
        expect(objectA1).toBe(objectA2)
        expect(objectB1).toBe(objectB2)

        expect(objectA1).not.toBe(objectB1)
        expect(objectA2).not.toBe(objectB2)

        expect(factory.mock.calls.length).toBe(2) // A, B
    })

    it('Global scope shortcut', () => {
        // Arrange ---------
        const factory = jest.fn(() => new Object())

        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', factory, Lifecycle.Scoped)
            .build()

        // Act -------------
        const object1 = container.get('typeKey')
        const object2 = container.scope(DIContainer.globalScopeKey).get('typeKey')

        // Assert ----------
        expect(object1).toBe(object2)
    })

    it('Close scope', () => {
        // Arrange ---------
        const scopeKey = 'A'
        const factory = jest.fn(() => new Object())
        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', factory, Lifecycle.Scoped)
            .build()

        // Act --------------
        const object1 = container.scope(scopeKey).get('typeKey')
        container.closeScope('A')
        const object2 = container.scope(scopeKey).get('typeKey')

        // Assert -----------
        expect(object1).not.toBe(object2)
    })

    it('Try to close global scope', () => {
        // Arrange -----
        const factory = jest.fn(() => new Object())
        const container = DIContainer.builder<{
            typeKey: object,
        }>()
            .bindFactory('typeKey', factory, Lifecycle.Scoped)
            .build()

        // Act ---------
        const object1 = container.scope(DIContainer.globalScopeKey).get('typeKey')
        container.closeScope(DIContainer.globalScopeKey)
        const object2 = container.scope(DIContainer.globalScopeKey).get('typeKey')

        // Assert ------
        expect(object1).toBe(object2) // Global scope was not closed
        expect(factory.mock.calls.length).toBe(1) // Object instance was re-used
    })

    it('Get instance provider', () => {
        // Arrange ----
        const expectedValue = 42
        const factory = jest.fn(r => ({ value: r.get('value') }))

        const container = DIContainer.builder<{
            value: number,
            object: { value: number },
        }>()
            .bindInstance('value', expectedValue)
            .bindFactory('object', factory, Lifecycle.LazySingleton) // do not create immediately
            .build()

        // Act ---------
        const factoryCallsBeforeGetProvider = factory.mock.calls.length
        const provider = container.getProvider('object')
        const factoryCallsAfterGetProvider = factory.mock.calls.length
        const instance1 = provider()
        const factoryCallsAfterFirstCallOfProvider = factory.mock.calls.length
        const instance2 = provider()
        const factoryCallsAfterSecondCallOfProvider = factory.mock.calls.length

        // Assert ------
        expect(factoryCallsBeforeGetProvider).toBe(0)
        expect(factoryCallsAfterGetProvider).toBe(0)
        expect(factoryCallsAfterFirstCallOfProvider).toBe(1) // object created
        expect(factoryCallsAfterSecondCallOfProvider).toBe(1) // object was re-used
        expect(instance1).toBe(instance2)
        expect(instance1.value).toBe(expectedValue)
    })

    it('Get lazy instance', () => {
        // Arrange ----
        const expectedValue = 42
        const factory = jest.fn(r => ({ value: r.get('value') }))

        const container = DIContainer.builder<{
            value: number,
            object: { value: number },
        }>()
            .bindInstance('value', expectedValue)
            .bindFactory('object', factory, Lifecycle.LazySingleton) // do not create immediately
            .build()

        // Act ---------
        const factoryCallsBeforeGetLazyInstance = factory.mock.calls.length
        const lazyInstance = container.getLazy('object')
        const factoryCallsAfterGetLazyInstance = factory.mock.calls.length
        const value = lazyInstance.value
        const factoryCallsAfterGetValueByInstance = factory.mock.calls.length

        // Assert ------
        expect(factoryCallsBeforeGetLazyInstance).toBe(0)
        expect(factoryCallsAfterGetLazyInstance).toBe(0) // There is an instance, but the factory is still not being called
        expect(factoryCallsAfterGetValueByInstance).toBe(1) // Object was created on first interaction with lazy-instance
        expect(isLazyInstance(lazyInstance)).toBeTruthy()
        expect(value).toBe(expectedValue)
    })

    it('Dont create lazy for instances & singletons', () => {
        // Arrange -------
        const expectedValue = 42
        const singletonFactory = jest.fn(r => ({ value: r.get('value') }))
        const lazySingletonFactory = jest.fn(r => ({ value: r.get('value') + 1 }))
        const container = DIContainer.builder<{
            value: number
            singletonObject: { value: number }
            lazySingletonObject: { value: number }
        }>()
            .bindInstance('value', expectedValue)
            .bindFactory('singletonObject', singletonFactory)
            .bindFactory('lazySingletonObject', lazySingletonFactory, Lifecycle.LazySingleton)
            .build()

        // Act --------------
        const value = container.getLazy('value')
        const singletonObject = container.getLazy('singletonObject')
        const lazySingletonObjectA = container.getLazy('lazySingletonObject')
        const valueFromLazyA = lazySingletonObjectA.value
        const lazySingletonObjectB = container.getLazy('lazySingletonObject')
        const valueFromLazyB = lazySingletonObjectA.value

        // Assert -----------
        expect(isLazyInstance(value)).toBeFalsy()
        expect(isLazyInstance(singletonObject)).toBeFalsy()
        expect(isLazyInstance(lazySingletonObjectA)).toBeTruthy()
        expect(valueFromLazyA).toBe(expectedValue + 1)

        // Instance was created, lazy wrapper is not required
        expect(isLazyInstance(lazySingletonObjectB)).toBeFalsy()
        expect(valueFromLazyB).toBe(expectedValue + 1)

        expect(lazySingletonFactory.mock.calls.length).toBe(1) // Lazy singleton instance re-used
    })

    it('Resolve named instances', () => {
        // Arrange -------
        const expectedDefaultValue = 11
        const expectedValueA = 22
        const expectedValueB = 33
        const container = DIContainer.builder<{ typeKey: number }>()
            .bindInstance('typeKey', expectedDefaultValue)
            .bindInstance('typeKey', expectedValueA, 'A')
            .bindInstance('typeKey', expectedValueB, 'B')
            .build()

        // Act -----------
        const value = container.get('typeKey')
        const valueA1 = container.get('typeKey', 'A')
        const valueA2 = container.get('typeKey', 'A')
        const valueB1 = container.get('typeKey', 'B')
        const valueB2 = container.get('typeKey', 'B')

        // Assert --------
        expect(value).toBe(expectedDefaultValue)
        expect(valueA1).toBe(expectedValueA)
        expect(valueA2).toBe(expectedValueA)
        expect(valueB1).toBe(expectedValueB)
        expect(valueB2).toBe(expectedValueB)
    })

    it('Get all instances', () => {
        // Arrange --------
        const container = DIContainer.builder<{ typeKey: number }>()
            .bindInstance('typeKey', 10)
            .bindInstance('typeKey', 146)
            .bindFactory('typeKey', () => 42)
            .build()

        // Act ------------
        const values = container.getAll('typeKey')

        // Assert ---------
        expect(values).toContain(10)
        expect(values).toContain(146)
        expect(values).toContain(42)
    })

    it('Dispose scoped instance when scope will be closed', () => {
        // Arrange -----------
        const scopeKey = 'A'
        const disposeMethod = jest.fn()

        const container = DIContainer.builder<{
            disposable: IDisposable
        }>()
            .bindFactory(
                'disposable',
                () => <IDisposable>{dispose: disposeMethod},
                Lifecycle.Scoped,
            )
            .build()

        // Act --------------
        const instDisposable = container.scope(scopeKey).get('disposable')
        container.closeScope(scopeKey)

        // Assert -----------
        expect(instDisposable).not.toBeNull()
        expect(disposeMethod.mock.calls.length).toBe(1) // "dispose()" was called
    })
})
