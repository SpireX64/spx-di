import {
    DIContainer,
    DIError,
    DIErrorType,
    Lifecycle,
    IDependencyResolver,
    IScopeDisposable,
} from '../src'
import InstanceActivator from '../src/internal/InstanceActivator'
import BindingsRegistrar from '../src/internal/BindingsRegistrar'
import createResolverMock from './utils/createResolverMock'
import createBinding from './utils/createBinding'

describe('InstanceActivator', () => {

    it('Try activate empty binding', () => {
        // Arrange -------------
        const resolver: IDependencyResolver<{ value: string }> = {
            getLazy: jest.fn(),
            getProvider: jest.fn(),
            getOptional: jest.fn(),
            get: jest.fn(),
            getAll: jest.fn(),
            getScopeDisposable(): IScopeDisposable { return null! },
        }

        const registrar = new BindingsRegistrar<{ value: string }>()
        registrar.register(createBinding('value'), 'bind')

        const activator = new InstanceActivator(registrar)
        let error: DIError | null = null

        // Act -----------------
        const binding = activator.find('value')
        try {
            activator.activate(resolver, binding!)
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.NullableBinding)
        expect(error?.message).toContain('value')
    })

    it('Short dependency cycle', () => {
        // Arrange --------------
        const registrar = new BindingsRegistrar<{ A: string, B: string }>()
        registrar.register(createBinding('A', { lifecycle: Lifecycle.Transient, factory: r => r.get('B') }), 'bind')
        registrar.register(createBinding('B', { lifecycle: Lifecycle.Transient, factory: r => r.get('A') }), 'bind')

        const activator = new InstanceActivator(registrar)
        const container = new DIContainer(activator)

        let error: DIError | null = null

        // Act ------------------
        try {
            container.get('A')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.DependencyCycle)
        expect(error?.message).toMatch('A -> B -> A')
    })

    it('Long dependency cycle', () => {
        // Arrange --------------
        const registrar = new BindingsRegistrar<{ A: string, B: string, C: string, D: string, E: string }>()
        registrar.register(createBinding('B', { lifecycle: Lifecycle.Transient, factory: r => r.get('C') }), 'bind')
        registrar.register(createBinding('A', { lifecycle: Lifecycle.Transient, factory: r => r.get('B') }), 'bind')
        registrar.register(createBinding('C', { lifecycle: Lifecycle.Transient, factory: r => r.get('D') }), 'bind')
        registrar.register(createBinding('D', { lifecycle: Lifecycle.Transient, factory: r => r.get('E') }), 'bind')
        registrar.register(createBinding('E', { lifecycle: Lifecycle.Transient, factory: r => r.get('A') }), 'bind')

        const activator = new InstanceActivator(registrar)
        const container = new DIContainer(activator)
        let error: DIError | null = null

        // Act ------------------
        try {
            container.get('A')
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ---------------
        expect(error).not.toBeNull()
        expect(error?.message).toMatch('A -> B -> C -> D -> E -> A')
    })

    it('Singletons activation', () => {
        // Arrange -----
        const registrar = new BindingsRegistrar<{
            SingletonFactory: string,
            SingletonInstance: string,
            LazySingleton: string,
            Transient: string,
        }>()
        registrar.register(createBinding('SingletonFactory', { lifecycle: Lifecycle.Singleton, factory: () => 'Singleton'}), 'bind')
        registrar.register(createBinding('SingletonInstance', { lifecycle: Lifecycle.Singleton, instance: 'Singleton'}), 'bind')
        registrar.register(createBinding('Transient', { lifecycle: Lifecycle.Transient, factory: () => 'Transient'}), 'bind')
        registrar.register(createBinding('LazySingleton', { lifecycle: Lifecycle.LazySingleton, factory: () => 'LazySingleton'}), 'bind')

        const activator = new InstanceActivator(registrar)
        const resolver = createResolverMock<typeof activator extends InstanceActivator<infer T> ? T : object>()

        // Act ----------
        const singletonsMap = activator.activateSingletons(resolver)

        const singletonInstanceByFactory = singletonsMap.get(registrar.find('SingletonFactory')!)
        const singletonInstance = singletonsMap.get(registrar.find('SingletonInstance')!)
        const transientInstance = singletonsMap.get(registrar.find('Transient')!)
        const lazySingletonInstance = singletonsMap.get(registrar.find('LazySingleton')!)

        // Assert -------
        expect(singletonInstanceByFactory).not.toBeNull()
        expect(singletonInstanceByFactory).toBe('Singleton')

        expect(singletonInstance).toBeUndefined() // Self-hosted
        expect(transientInstance).toBeUndefined()
        expect(lazySingletonInstance).toBeUndefined()
    })
});