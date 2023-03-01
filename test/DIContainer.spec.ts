import DIContainer from '../src/DIContainer'
import BindingNotFoundDIError from '../src/errors/BindingNotFoundDIError'
import { Lifecycle } from '../src/types'

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

    it('Get value by factory binding', () => {
        // Arrange -----
        const expectedValue = 42
        const factory = jest.fn(() => expectedValue)

        const container = DIContainer.builder<{ value: number }>()
            .bindFactory('value', factory)
            .build()

        // Act ---------
        const value = container.get('value')

        // Assert ------
        expect(value).toBe(expectedValue)
        expect(factory.mock.calls.length).toBe(1)
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
            .bindFactory('typeKey', factory, Lifecycle.TRANSIENT)
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
})
