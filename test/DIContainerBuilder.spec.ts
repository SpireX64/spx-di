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
});