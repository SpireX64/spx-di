import DIContainer, {DIContainerBuilder} from '../src/DIContainer'

describe('DIContainerBuilder', () => {
    it('Create builder via static method', () => {
        // Act ---------
        const builder = DIContainer.builder()

        // Assert -----
        expect(builder).toBeInstanceOf(DIContainerBuilder)
    })

    it('Build DIContainer by builder', () => {
        // Arrange ----
        const builder = DIContainer.builder()

        // Act --------
        const container = builder.build()

        // Assert -----
        expect(container).toBeInstanceOf(DIContainer)
    })

    it('Try get not exist binding', () => {
        // Arrange ----
        const builder = DIContainer.builder<{ value: string }>()

        // Act --------
        const binding = builder.getBindingOfType('value')

        // Assert -----
        expect(binding).toBeNull()
    })

    it('Value binding', () => {
        // Arrange ----
        const expectedValue = 42
        const builder = DIContainer.builder<{value: typeof expectedValue}>()

        // Act --------
        const outBuilder = builder.bindInstance('value', expectedValue)
        const binding = builder.getBindingOfType('value')

        // Assert -----
        expect(outBuilder).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.type).toBe('value')
        expect(binding?.instance).toBe(expectedValue)
        expect(binding?.factory).toBeNull()
    })

    it('Factory binding', () => {
        // Arrange ----
        const builder = DIContainer.builder<{ typeKey: string }>()
        const factory = jest.fn(() => 'test')

        // Act --------
        const outBuilder = builder.bindFactory('typeKey', factory)
        const binding = builder.getBindingOfType('typeKey')

        // Assert -----
        expect(outBuilder).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.type).toBe('typeKey')
        expect(binding?.factory).toBe(factory)
        expect(binding?.instance).toBeNull()
    })
});