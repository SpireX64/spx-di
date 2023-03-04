import IDependencyResolver from '../src/IDepencencyResolver'
import DIContainer from '../src/DIContainer'
import EntityActivator from '../src/EntityActivator'
import NullableBindingDIError from '../src/errors/NullableBindingDIError'
import DependencyCycleDIError from '../src/errors/DependencyCycleDIError'
import { Lifecycle } from '../src/types'
import createResolverMock from "./utils/createResolverMock";

describe('EntityActivator', () => {
    it('Get binding of type', () => {
        // Arrange -----------
        const expectedBinding = { type: 'value', lifecycle: Lifecycle.Singleton, instance: 10, name: null }
        const activator = new EntityActivator([expectedBinding])

        // Act ----------------
        const binding = activator.findBindingOf('value')

        // Assert -------------
        expect(binding).toBe(expectedBinding)
    })

    it('Get not exist binding', () => {
        // Arrange -------------
        const activator = new EntityActivator<{ value: number }>([])

        // Act -----------------
        const binding = activator.findBindingOf('value')

        // Assert --------------
        expect(binding).toBe(null)
    })

    it('Try activate empty binding', () => {
        // Arrange -------------
        const resolver: IDependencyResolver<{ value: string }> = {
            getLazy: jest.fn(),
            getProvider: jest.fn(),
            get: jest.fn()
        }
        const activator = new EntityActivator([
            { type: 'value', lifecycle: Lifecycle.Singleton, name: null}
        ])
        let error: NullableBindingDIError | null = null

        // Act -----------------
        const binding = activator.findBindingOf('value')
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
        const activator = new EntityActivator([
            { type: 'A', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('B') },
            { type: 'B', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('A') }
        ])
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
        const bindings = [
            { type: 'B', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('C') },
            { type: 'A', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('B') },
            { type: 'C', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('D') },
            { type: 'D', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('E') },
            { type: 'E', name: null, lifecycle: Lifecycle.Transient, factory: (r: IDependencyResolver<any>) => r.get('A') },
        ]
        const activator = new EntityActivator(bindings)
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

    it('Singletons activation', () => {
        // Arrange -----
        const bindings = [
            { type: 'Singleton', lifecycle: Lifecycle.Singleton, factory: () => 'Singleton', name: null },
            { type: 'Bound', lifecycle: Lifecycle.Singleton, instance: 'Bound', name: null },
            { type: 'Transient', lifecycle: Lifecycle.Transient, factory: () => 'Transient', name: null },
            { type: 'LazySingleton', lifecycle: Lifecycle.LazySingleton, factory: () => 'LazySingleton', name: null },
        ]
        const activator = new EntityActivator(bindings)
        const resolver = createResolverMock<typeof activator extends EntityActivator<infer T> ? T : object>()

        // Act ----------
        const singletonsMap = activator.activateSingletons(resolver)

        const singletonInstance = singletonsMap.get(bindings.find(it => it.type == 'Singleton')!)
        const boundInstance = singletonsMap.get(bindings.find(it => it.type == 'Bound')!)
        const transientInstance = singletonsMap.get(bindings.find(it => it.type == 'Transient')!)
        const lazySingletonInstance = singletonsMap.get(bindings.find(it => it.type == 'LazySingleton')!)

        // Assert -------
        expect(singletonInstance).not.toBeNull()
        expect(singletonInstance).toBe('Singleton')

        expect(boundInstance).toBeUndefined() // Self-hosted
        expect(transientInstance).toBeUndefined()
        expect(lazySingletonInstance).toBeUndefined()
    })
});