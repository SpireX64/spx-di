import BindingsRegistrar from '../src/internal/BindingsRegistrar'
import createBinding from './utils/createBinding'
import { DIError, DIErrorType, Lifecycle } from '../src'

type SampleTypeMap = {
    someString: string
    someNumber: number
    otherString: string
    otherNumber: number
}

describe('BindingsRegistrar', () => {
    it('Initial State', () => {
        // Act -----
        const registrar = new BindingsRegistrar<SampleTypeMap>()

        // Assert ------
        expect(registrar.getAllBindings().length).toBe(0)
    })

    it('Register binding', () => {
        // Arrange ----
        const registrar = new BindingsRegistrar<SampleTypeMap>()
        const binding = createBinding<SampleTypeMap, 'someString'>('someString')

        // Act --------
        registrar.register(binding, 'bind')

        // Assert -----
        expect(registrar.getAllBindings().length).toBe(1)
        expect(registrar.find('someString')).toBe(binding)
    })

    it('Multi register type with "bind" resolution', () => {
        // Arrange ----
        const registrar = new BindingsRegistrar<SampleTypeMap>()
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 1 })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 2 })

        // Act --------
        registrar.register(binding1, 'bind')
        registrar.register(binding2, 'bind')

        const bindings = registrar.findAllOf('someNumber')

        // Assert -----
        expect(bindings.length).toBe(2)
        expect(bindings).toContain(binding1)
        expect(bindings).toContain(binding2)
    })

    it('Multi register type with "skip" resolution', () => {
        // Arrange ----
        const registrar = new BindingsRegistrar<SampleTypeMap>()
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 1 })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 2 })

        // Act --------
        registrar.register(binding1, 'skip')
        registrar.register(binding2, 'skip')

        const bindings = registrar.findAllOf('someNumber')

        // Assert -----
        expect(bindings.length).toBe(1)
        expect(bindings).toContain(binding1)
        expect(bindings).not.toContain(binding2)
    })

    it('Multi register type with "override" resolution', () => {
        // Arrange ----
        const registrar = new BindingsRegistrar<SampleTypeMap>()
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 1 })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 2 })

        // Act --------
        registrar.register(binding1, 'override')
        registrar.register(binding2, 'override')

        const bindings = registrar.findAllOf('someNumber')

        // Assert -----
        expect(bindings.length).toBe(1)
        expect(bindings).not.toContain(binding1)
        expect(bindings).toContain(binding2)
    })

    it('Multi register type with "throw" resolution', () => {
        // Arrange ----
        const registrar = new BindingsRegistrar<SampleTypeMap>()
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 1 })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { instance: 2 })

        let error: DIError | null = null

        // Act --------
        registrar.register(binding1, 'throw')
        try {
            registrar.register(binding2, 'throw')
        } catch (err) {
            if (err instanceof DIError)
                error = err
        }

        const bindings = registrar.findAllOf('someNumber')

        // Assert -----
        expect(bindings.length).toBe(1)
        expect(bindings).toContain(binding1)
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.BindingConflict)
    })

    it('Find binding by predicate', () => {
        // Arrange ----
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', scope: 'bar', lifecycle: Lifecycle.Singleton })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'baz', lifecycle: Lifecycle.Transient })
        const binding3 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', instance: 3 })

        const registrar = new BindingsRegistrar<SampleTypeMap>()
        registrar.register(binding1, 'bind')
        registrar.register(binding2, 'bind')
        registrar.register(binding3, 'bind')

        // Act --------
        const predicate = jest.fn(it => it.lifecycle == Lifecycle.Singleton)
        const result = registrar.find('someNumber', predicate)

        // Assert -----
        expect(result).not.toBeNull()
        expect(result).toBe(binding1)
        expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('Try to find not exist binding', () => {
        // Arrange ----
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', scope: 'bar', lifecycle: Lifecycle.Singleton })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'baz', lifecycle: Lifecycle.Transient })
        const binding3 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', instance: 3 })

        const registrar = new BindingsRegistrar<SampleTypeMap>()
        registrar.register(binding1, 'bind')
        registrar.register(binding2, 'bind')
        registrar.register(binding3, 'bind')

        // Act --------
        const predicate = jest.fn(it => it.lifecycle == Lifecycle.Scoped)
        const result = registrar.find('someNumber', predicate)

        // Assert -----
        expect(result).toBeNull()
        expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(1)
    })

    it('Find all bindings by predicate', () => {
        // Arrange ----
        const binding1 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', scope: 'bar' })
        const binding2 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'baz', lifecycle: Lifecycle.Scoped })
        const binding3 = createBinding<SampleTypeMap, 'someNumber'>('someNumber', { name: 'foo', instance: 3 })

        const registrar = new BindingsRegistrar<SampleTypeMap>()
        registrar.register(binding1, 'bind')
        registrar.register(binding2, 'bind')
        registrar.register(binding3, 'bind')
        const bindingsCount = registrar.getAllBindings().length

        // Act --------
        const predicate = jest.fn(it => it.name === 'foo')
        const result = registrar.findAllOf('someNumber', predicate)

        // Assert -----
        expect(result).not.toBeNull()
        expect(result).toContain(binding1)
        expect(result).toContain(binding3)
        expect(result).not.toContain(binding2)
        expect(predicate.mock.calls.length).toBe(bindingsCount)
    })
});