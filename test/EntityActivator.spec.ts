import IEntityBinding from '../src/IEntityBinding'
import IDependencyResolver from '../src/IDepencencyResolver'
import DIContainer from '../src/DIContainer'
import EntityActivator from '../src/EntityActivator'
import NullableBindingDIError from '../src/errors/NullableBindingDIError'
import DependencyCycleDIError from '../src/errors/DependencyCycleDIError'
import { Lifecycle } from '../src/types'

describe('EntityActivator', () => {
    it('Get binding of type', () => {
        // Arrange -----------
        const expectedBinding = { type: 'value', lifecycle: Lifecycle.SINGLETON, instance: 10, }
        const bindingsMap = new Map([
            [expectedBinding.type, expectedBinding],
        ])
        const activator = new EntityActivator(bindingsMap)

        // Act ----------------
        const binding = activator.findBinding('value')

        // Assert -------------
        expect(binding).toBe(expectedBinding)
    })

    it('Get not exist binding', () => {
        // Arrange -------------
        const map = new Map<'value', IEntityBinding<{ value: string }, 'value'>>()
        const activator = new EntityActivator(map)

        // Act -----------------
        const binding = activator.findBinding('value')

        // Assert --------------
        expect(binding).toBe(null)
    })

    it('Try activate empty binding', () => {
        // Arrange -------------
        const bindingsMap = new Map([
            ['value', { type: 'value', lifecycle: Lifecycle.SINGLETON }],
        ])
        const resolver: IDependencyResolver<{ value: string }> = {
            get: jest.fn()
        }
        const activator = new EntityActivator(bindingsMap)
        let error: NullableBindingDIError | null = null

        // Act -----------------
        const binding = activator.findBinding('value')
        try {
            activator.activate(resolver, binding!)
        } catch (e) {
            if (e instanceof NullableBindingDIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.type).toBe('value')
    })

    it('Short dependency cycle', () => {
        // Arrange --------------
        const bindingsMap = new Map([
            ['A', { type: 'A', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('B') }],
            ['B', { type: 'B', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('A') }],
        ])
        const activator = new EntityActivator(bindingsMap)
        const container = new DIContainer(activator)

        let error: DependencyCycleDIError | null = null

        // Act ------------------
        try {
            container.get('A')
        } catch (e) {
            if (e instanceof DependencyCycleDIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.message).toMatch('A -> B -> A')
    })

    it('Long dependency cycle', () => {
        // Arrange --------------
        const bindingsMap = new Map([
            ['A', { type: 'A', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('B') }],
            ['B', { type: 'B', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('C') }],
            ['C', { type: 'C', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('D') }],
            ['D', { type: 'D', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('E') }],
            ['E', { type: 'E', lifecycle: Lifecycle.SINGLETON, factory: (r: IDependencyResolver<any>) => r.get('A') }],
        ])
        const activator = new EntityActivator(bindingsMap)
        const container = new DIContainer(activator)
        let error: DependencyCycleDIError | null = null

        // Act ------------------
        try {
            container.get('A')
        } catch (e) {
            if (e instanceof DependencyCycleDIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.message).toMatch('A -> B -> C -> D -> E -> A')
    })
});