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

    it('Add value binding', () => {
        // Arrange ----
        const expectedValue = 42
        const builder = DIContainer.builder<{value: typeof expectedValue}>()

        // Act --------
        const result = builder.bindInstance('value', expectedValue)
        const binding = builder.getBindingOfType('value')

        // Assert -----
        expect(result).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.type).toBe('value')
        expect(binding?.instance).toBe(expectedValue)
    })
});