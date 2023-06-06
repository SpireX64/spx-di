import {
    DIContainer,
    DIModule,
    DIError,
    DIErrorType,
    IDisposable,
    IScopeDisposable,
    isPhantomInstance,
    Lifecycle,
    TScopeKey,
} from '../src'
import type { SomeClass } from './utils/stubs/dynamicModuleStub'

describe('DIContainer', function () {
    it('Try get not bound value', () => {
        // Arrange -----
        const container = DIContainer.builder<{ value: number }>().build()
        let error: DIError | null = null

        // Act ---------
        try {
            container.get('value')
        } catch (err) {
            if (err instanceof  DIError)
                error = err as DIError
        }

        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.type).toBe(DIErrorType.BindingNotFound)
        expect(error?.message).toContain('value')
    })

    it('Get optional value without binding', () => {
        // Arrange -----
        const container = DIContainer.builder<{ value: string }>().build()

        // Act ---------
        const value = container.getOptional('value')

        // Assert ------
        expect(value).toBeUndefined()
    })

    it('Get optional value with binding', () => {
        // Arrange ------
        const expectedValue = 'hello'
        const container = DIContainer.builder<{ value: string }>()
            .bindInstance('value', expectedValue)
            .build()

        // Act ----------
        const value = container.getOptional('value')

        // Assert -------
        expect(value).toBe(expectedValue)
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
        container.disposeScope('A')
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
        container.disposeScope(DIContainer.globalScopeKey)
        const object2 = container.scope(DIContainer.globalScopeKey).get('typeKey')

        // Assert ------
        expect(object1).toBe(object2) // Global scope was not closed
        expect(factory.mock.calls.length).toBe(1) // Object instance was re-used
    })

    it('Limit instance scope', () => {
        // Arrange -----
        const allowedScopeName: TScopeKey = 'scope'

        const container = DIContainer.builder<{
            typeKey: object
        }>()
            .bindFactory(
                'typeKey',
                () => new Object(),
                Lifecycle.Scoped,
                {scope: allowedScopeName},
            )
            .build()

        let errorAtGlobalScope: DIError | null = null

        // Act ---------
        try {
            container.get('typeKey')
        } catch (err) {
            if (err instanceof DIError)
                errorAtGlobalScope = err as DIError
        }

        const instanceAtAllowedScope = container
            .scope(allowedScopeName)
            .get('typeKey')

        // Assert ------
        expect(errorAtGlobalScope).not.toBeNull()
        expect(errorAtGlobalScope?.type).toBe(DIErrorType.BindingNotFound)
        expect(instanceAtAllowedScope).not.toBeNull()
    })

    it('Get instance provider', () => {
        // Arrange ----
        const expectedValue = 42
        const factory = jest.fn(r => ({value: r.get('value')}))

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

    it('Get phantom instance', () => {
        // Arrange ----
        const expectedValue = 42
        const expectedNewValue = 12
        const factory = jest.fn(r => ({ value: r.get('value') }))

        const container = DIContainer.builder<{
            value: number,
            object: { value: number },
        }>()
            .bindInstance('value', expectedValue)
            .bindFactory('object', factory, Lifecycle.LazySingleton) // do not create immediately
            .build()

        // Act ---------
        const factoryCallsBeforeGetInstance = factory.mock.calls.length
        const instance = container.getPhantom('object')
        const factoryCallsAfterGetInstance = factory.mock.calls.length
        const value = instance.value
        const factoryCallsAfterGetValueByInstance = factory.mock.calls.length
        instance.value = expectedNewValue


        // Assert ------
        expect(factoryCallsBeforeGetInstance).toBe(0)
        expect(factoryCallsAfterGetInstance).toBe(0) // There is an instance, but the factory is still not being called
        expect(factoryCallsAfterGetValueByInstance).toBe(1) // Object was created on first interaction with lazy-instance
        expect(isPhantomInstance(instance)).toBeTruthy()
        expect(value).toBe(expectedValue)
        expect(instance.value).toBe(expectedNewValue)
        // @ts-ignore
        expect(instance.notDefinedProperty).toBeUndefined()
        expect(() => {
            // @ts-ignore
            instance.notDefinedProperty = 'foobar'
        }).toThrow()
    })

    it('Dont create phantom for instances & singletons', () => {
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
        const value = container.getPhantom('value')
        const singletonObject = container.getPhantom('singletonObject')
        const phantomSingletonObjectA = container.getPhantom('lazySingletonObject')
        const valueFromLazyA = phantomSingletonObjectA.value
        const phantomSingletonObjectB = container.getPhantom('lazySingletonObject')
        const valueFromLazyB = phantomSingletonObjectA.value

        // Assert -----------
        expect(isPhantomInstance(value)).toBeFalsy()
        expect(isPhantomInstance(singletonObject)).toBeFalsy()
        expect(isPhantomInstance(phantomSingletonObjectA)).toBeTruthy()
        expect(valueFromLazyA).toBe(expectedValue + 1)

        // Instance was created, phantom wrapper is not required
        expect(isPhantomInstance(phantomSingletonObjectB)).toBeFalsy()
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
            .bindInstance('typeKey', expectedValueA, {name: 'A'})
            .bindInstance('typeKey', expectedValueB, {name: 'B'})
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
        container.disposeScope(scopeKey)

        // Assert -----------
        expect(instDisposable).not.toBeNull()
        expect(disposeMethod.mock.calls.length).toBe(1) // "dispose()" was called
    })

    it('Get global scope disposable', () => {
        // Arrange ----------
        const disposeFunction = jest.fn()
        const container = DIContainer.builder<{
            typeKey: object
        }>()
            .bindFactory('typeKey', () => ({ dispose: disposeFunction }), Lifecycle.Scoped)
            .build()

        // Act --------------
        const scopedObject = container.get('typeKey')
        const disposable = container.getScopeDisposable()
        disposable.dispose()

        // Assert -----------
        expect(scopedObject).not.toBeNull()
        expect(disposable).not.toBeNull()
        expect(disposable.scopeKey).toBe(DIContainer.globalScopeKey)
        expect(disposable.isScopeDisposed()).toBeFalsy() // Global scope can't be disposed, but no error
        expect(disposeFunction.mock.calls.length).toBe(0)
    })

    it('Dispose non-exists scope', () => {
        const container = DIContainer.builder().build()

        expect(() => {
            container.disposeScope('non-exists')
        }).not.toThrowError()
    })

    it('Get specific scope disposable', () => {
        // Arrange -----------
        const expectedScopeKey: TScopeKey = Symbol('foo')
        const disposeFunction = jest.fn()

        const container = DIContainer.builder<{
            typeKey: object
        }>()
            .bindFactory('typeKey', () => ({ dispose: disposeFunction }), Lifecycle.Scoped)
            .build()

        // Act ----------------
        const scopedObject = container.scope(expectedScopeKey).get('typeKey')
        const disposable = container.getScopeDisposable(expectedScopeKey)
        disposable.dispose()

        // Assert -------------
        expect(scopedObject).not.toBeNull()
        expect(disposable).not.toBeNull()
        expect(disposable.scopeKey).toBe(expectedScopeKey)
        expect(disposable.isScopeDisposed()).toBeTruthy()
        expect(disposeFunction.mock.calls.length).toBe(1)
    })

    it('Provide current scope disposable to instance', () => {
        // Arrange --------
        const expectedScopeKey: TScopeKey = Symbol('foo')
        const disposeFunction = jest.fn()

        const container = DIContainer.builder<{
            'typeKey': { scopeDisposable: IScopeDisposable },
        }>()
            .bindFactory('typeKey', r => ({
                scopeDisposable: r.getScopeDisposable(),
                dispose: disposeFunction,
            }), Lifecycle.Scoped)
            .build()

        // Act ------------
        const obj = container.scope(expectedScopeKey).get('typeKey')
        obj.scopeDisposable.dispose()

        // Assert ---------
        expect(obj.scopeDisposable.scopeKey).toBe(expectedScopeKey)
        expect(obj.scopeDisposable.isScopeDisposed()).toBeTruthy()
        expect(disposeFunction.mock.calls.length).toBe(1)
    })

    it('Get scoped singleton value in scope', () => {
        // Arrange ----
        const expectedValue = 'Hello'
        const container = DIContainer.builder<{ typeKey: { name: string } }>()
            .bindFactory('typeKey', () => ({name: expectedValue}), Lifecycle.Singleton, { scope: 'foo' })
            .build()

        // Act --------
        const value = container.scope('foo').get('typeKey')
        container.disposeScope('foo')
        const value2 = container.scope('foo').get('typeKey')

        // Assert -----
        expect(value.name).toBe(expectedValue)
        expect(value2.name).toBe(expectedValue)
        expect(value2).toBe(value)
    })

    it('Add static module', () => {
        type ModuleTypeMap = {
            typeKey: string
            someNumber: number
        }
        const moduleKey = Symbol('staticTestModule')
        const expectedValue = 'Lorem'
        const expectedNumber = 42
        // Arrange ---------
        const staticModule = DIModule.static(moduleKey).create<ModuleTypeMap>((builder) => {
            builder.bindInstance('typeKey', expectedValue)
            builder.bindFactory('someNumber', () => expectedNumber)
        })

        // Act -------------
        const container = DIContainer.builder()
            .addModule(staticModule)
            .build()

        // Assert ----------
        expect(container.get('typeKey')).toBe(expectedValue)
        expect(container.get('someNumber')).toBe(expectedNumber)
    })

    it('Add and load dynamic module', async () => {
        type ModuleTypeMap = {
            value: string
            object: SomeClass
        }
        const moduleKey = Symbol('dynamicTestModule')
        const prefix = 'lorem'

        // Arrange --------
        const dynamicModule = DIModule.dynamic(
            moduleKey,
            () => import('./utils/stubs/dynamicModuleStub'),
        ).create<ModuleTypeMap>((builder, jsModule) => {
            // Deconstruct support
            const { SomeClass, someValue } = jsModule
            builder.bindInstance('value', someValue)
            builder.bindFactory('object', c => new SomeClass(prefix + c.get('value')))

            // Direct access support
            builder.bindFactory('value', () => jsModule.someValue, Lifecycle.Transient, { name: Lifecycle.Transient })
        });

        // Act ------------
        const container = DIContainer.builder()
            .addModule(dynamicModule)
            .build()

        await container.loadModuleAsync(dynamicModule)

        // Asset ----------
        expect(container.get('value')).toBe('value')
        expect(container.get('value')).toBe(container.get('value', Lifecycle.Transient))
        expect(container.get('object').value).toBe(prefix + 'value')
    })

    it('Loading a dynamic module with invalid import', async () => {
        // Arrange ---------
        const dynamicModule = DIModule.dynamic(
            'dynamic-module',
            () => Promise.reject<{ someValue: string }>()
        ).create<{ value: string }>((builder, { someValue }) =>
            builder
                .bindInstance('value', someValue))

        const container = DIContainer.builder()
            .addModule(dynamicModule)
            .build()

        // Act ---------
        let error: DIError | null = null
        try {
            await container.loadModuleAsync(dynamicModule)
        } catch (e) {
            if (e instanceof DIError)
                error = e as DIError
        }

        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.type).toBe(DIErrorType.IllegalState)
        expect(error?.message).toContain(dynamicModule.key)
    })

    it('Loading an unadded dynamic module', async () => {
        // Arrange -------
        type ModuleTypeMap = {
            value: string
            object: SomeClass
        }
        const moduleKey = Symbol('dynamicTestModule')
        const dynamicModule = DIModule.dynamic(
            moduleKey,
            () => import('./utils/stubs/dynamicModuleStub'),
        ).create<ModuleTypeMap>((builder, { someValue, SomeClass }) => {
            builder.bindInstance('value', someValue)
            builder.bindFactory('object', c => new SomeClass(c.get('value')))
        });
        const container = DIContainer.builder().build()

        // Act --------
        let error: DIError | null = null
        try {
            // @ts-ignore Type-check warn about unadded module loading
            await container.loadModuleAsync(dynamicModule)
        } catch (e) {
            if (e instanceof DIError)
                error = e as DIError
        }

        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.type).toBe(DIErrorType.IllegalState)
        expect(error?.message).toContain(moduleKey.toString())
    })
})
