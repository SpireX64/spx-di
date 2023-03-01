import IEntityBinding from '../src/IEntityBinding'
import IDependencyResolver from '../lib/IDepencencyResolver'
import EntityActivator from '../src/EntityActivator'
import NullableBindingDIError from '../src/errors/NullableBindingDIError'

describe('EntityActivator', () => {
    it('Get binding of type', () => {
        // Arrange -----------
        const expectedBinding = { type: 'value', instance: 10 }
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
            [ 'value', { type: 'value' } ],
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
});