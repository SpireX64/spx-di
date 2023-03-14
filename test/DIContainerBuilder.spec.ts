import {
    DIContainer,
    DIContainerBuilder,
    createDIModule,
    Lifecycle,
    NullableBindingDIError,
    MultiBindingDIError,
    BindingConflictDIError,
    TypeMapOfModule
} from '../src'

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
        const binding = builder.findBindingOf('value')

        // Assert -----
        expect(binding).toBeNull()
    })

    it('Value binding', () => {
        // Arrange ----
        const expectedValue = 42
        const builder = DIContainer.builder<{value: typeof expectedValue}>()

        // Act --------
        const outBuilder = builder.bindInstance('value', expectedValue)
        const binding = builder.findBindingOf('value')

        // Assert -----
        expect(outBuilder).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.lifecycle).toBe(Lifecycle.Singleton)
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
        const binding = builder.findBindingOf('typeKey')

        // Assert -----
        expect(outBuilder).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.lifecycle).toBe(Lifecycle.Singleton)
        expect(binding?.type).toBe('typeKey')
        expect(binding?.factory).toBe(factory)
        expect(binding?.instance).toBeNull()
    })

    it('Factory binding with dependency', () => {
        // Arrange -----
        const builder = DIContainer.builder<{
            originValue: number,
            factoryValue: number
        }>()
        const factory = jest.fn(r => r.get('originValue'))

        // Act ---------
        builder
            .bindInstance('originValue', 10)
            .bindFactory('factoryValue', factory)

        const factoryBinding = builder.findBindingOf('factoryValue')

        // Assert ------
        expect(factoryBinding).not.toBeNull()
        expect(factoryBinding?.type).toBe('factoryValue')
        expect(factoryBinding?.factory).toBe(factory)
        expect(factoryBinding?.instance).toBeNull()
    })

    it('Factory binding with lifecycle override', () => {
        // Arrange ----
        const builder = DIContainer.builder<{ typeKey: string }>()
        const factory = jest.fn(() => 'test')

        // Act --------
        const outBuilder = builder.bindFactory('typeKey', factory, Lifecycle.Transient)
        const binding = builder.findBindingOf('typeKey')

        // Assert -----
        expect(outBuilder).toBe(builder)
        expect(binding).not.toBeNull()
        expect(binding?.lifecycle).toBe(Lifecycle.Transient)
        expect(binding?.type).toBe('typeKey')
        expect(binding?.factory).toBe(factory)
        expect(binding?.instance).toBeNull()
    })

    it('Conditional binding by boolean', () => {
        // Arrange -----
        const builder = DIContainer.builder<{
            foo: string
            bar: string
            qwe: string
        }>()

        // Act ---------
        builder
            .when(true).bindInstance('foo', 'FOO')
            .when(false).bindInstance('bar', 'BAR')
            .bindInstance('qwe', 'QWE')

        const fooBinding = builder.findBindingOf('foo')
        const barBinding = builder.findBindingOf('bar')
        const qweBinding = builder.findBindingOf('qwe')

        // Assert ------
        expect(fooBinding).not.toBeNull()
        expect(barBinding).toBeNull()
        expect(qweBinding).not.toBeNull()
    })

    it('Conditional binding by predicate', () => {
        // Arrange -----------
        const builder = DIContainer.builder<{
            foo: string
            bar: string
            isFooBound: boolean
            isBarBound: boolean
        }>()

        // Act --------------
        const container = builder
            .bindInstance('foo', 'Hello!')
            .when(it => it.findBindingOf('foo') != null)
                .bindInstance('isFooBound', true)
            .when(it => it.findBindingOf('foo') == null)
                .bindInstance('isFooBound', false)
            .when(it => it.findBindingOf('bar') != null)
                .bindInstance('isBarBound', true)
            .when(it => it.findBindingOf('bar') == null)
                .bindInstance('isBarBound', false)
            .build()

        const isFooBound = container.get('isFooBound')
        const isBarBound = container.get('isBarBound')

        // Assert -----------
        expect(isFooBound).toBeTruthy()
        expect(isBarBound).toBeFalsy()
    })

    it('Force nullable instance binding', () => {
        // Arrange -----
        const builder = DIContainer.builder<{ typeKey: string }>()
        let error: NullableBindingDIError | null = null

        // Act ---------
        try {
            builder.bindInstance('typeKey', null!)
        } catch (e) {
            if (e instanceof NullableBindingDIError)
                error = e
        }

        // Assert
        expect(error).not.toBeNull()
        expect(error?.type).toBe('typeKey')
    })

    it('Force nullable factory binding', () => {
        // Arrange -----
        const builder = DIContainer.builder<{ typeKey: string }>()
        let error: NullableBindingDIError | null = null

        // Act ---------
        try {
            builder.bindFactory('typeKey', null!)
        } catch (e) {
            if (e instanceof NullableBindingDIError)
                error = e
        }
        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.type).toBe('typeKey')
    })

    it('Bind named instance', () => {
        // Arrange -----
        const expectedValueA = 10
        const expectedValueB = 42
        const builder = DIContainer.builder<{ typeKey: number }>()

        // Act ----------
        builder
            .bindInstance('typeKey', expectedValueA, { name: 'A' })
            .bindInstance('typeKey', expectedValueB, { name: 'B' })

        const bindingDefault = builder.findBindingOf('typeKey')
        const bindingA = builder.findBindingOf('typeKey', 'A')
        const bindingB = builder.findBindingOf('typeKey', 'B')

        // Assert -------
        expect(bindingDefault).toBeNull()

        expect(bindingA?.name).toBe('A')
        expect(bindingA?.instance).toBe(expectedValueA)

        expect(bindingB?.name).toBe('B')
        expect(bindingB?.instance).toBe(expectedValueB)
    })

    it('Multi-instance binding', () => {
        // Arrange -------
        const expectedValue1 = 1
        const expectedValue2 = 2
        const builder = DIContainer.builder<{ typeKey: number }>()

        // Act -----------
        builder
            .bindInstance('typeKey', expectedValue1)
            .bindInstance('typeKey', expectedValue2)

        const bindings = builder.getAllBindingsOf('typeKey')

        // Assert --------
        expect(bindings.length).toBe(2)
        expect(bindings[0].instance).toBe(expectedValue1)
        expect(bindings[1].instance).toBe(expectedValue2)
    })

    it('Multi-factory binding', () => {
        // Arrange -----
        const factory1 = () => 123
        const factory2 = () => 321
        const builder = DIContainer.builder<{ typeKey: number }>()

        // Act ---------
        builder
            .bindFactory('typeKey', factory1)
            .bindFactory('typeKey', factory2)

        const bindings = builder.getAllBindingsOf('typeKey')

        // Assert ------
        expect(bindings.length).toBe(2)
        expect(bindings[0]).not.toBe(bindings[1])
        expect(bindings[0].type).toBe(bindings[1].type)
        expect(bindings[0].factory).toBe(factory1)
        expect(bindings[1].factory).toBe(factory2)
    })

    it('Mixed multi binding', () => {
        // Arrange ----------
        const value = 'Foobar'
        const factory = () => 'Hello'

        const builder = DIContainer.builder<{ typeKey: string }>()

        // Act --------------
        builder
            .bindInstance('typeKey', value)
            .bindFactory('typeKey', factory)

        const bindings = builder.getAllBindingsOf('typeKey')

        // Assert -----------
        expect(bindings.length).toBe(2)
        expect(bindings[0]).not.toBe(bindings[1])
        expect(bindings[0].instance).toBe(value)
        expect(bindings[0].factory).toBeNull()
        expect(bindings[0].lifecycle).toBe(Lifecycle.Singleton)
        expect(bindings[1].instance).toBeNull()
        expect(bindings[1].factory).toBe(factory)
        expect(bindings[1].lifecycle).toBe(Lifecycle.Singleton)
    })

    it('Multi named binding', () => {
        // Arrange -----------
        const strings = ["Hello", "World", "Foo", "Bar", "Qwe"]
        const name = 'A'

        const builder = DIContainer.builder<{ typeKey: string }>()

        // Act ---------------
        builder
            .bindInstance('typeKey', strings[0])
            .bindInstance('typeKey', strings[1])
            .bindInstance('typeKey', strings[2], { name })
            .bindInstance('typeKey', strings[3], { name })
            .bindInstance('typeKey', strings[4], { name })

        const defaultBindings = builder.getAllBindingsOf('typeKey')
        const namedBindings = builder.getAllBindingsOf('typeKey', name)

        // Assert ------------
        expect(defaultBindings.length).toBe(2)
        expect(namedBindings.length).toBe(3)

        expect(defaultBindings[0].instance).toBe(strings[0])
        expect(defaultBindings[1].instance).toBe(strings[1])

        expect(namedBindings[0].instance).toBe(strings[2])
        expect(namedBindings[1].instance).toBe(strings[3])
        expect(namedBindings[2].instance).toBe(strings[4])
    })

    it('Throw error on non-singleton binding', () => {
        // Arrange ----
        const builder = DIContainer.builder<{ typeKey: number }>()
        let error: MultiBindingDIError | null = null

        // Act --------
        try {
            builder
                .bindFactory('typeKey', () => 1)
                .bindFactory('typeKey', () => 2, Lifecycle.LazySingleton)
        } catch (e) {
            if (e instanceof MultiBindingDIError)
                error = e
        }

        // Assert -----
        expect(error).not.toBeNull()
        expect(error?.message).toMatch(`${Lifecycle.LazySingleton} "typeKey"`)
    })

    it('Separate DI configuration to modules', () => {
        // Arrange -----
        const moduleA = createDIModule<{ valueA: number }>(builder => {
            builder
                .bindInstance('valueA', 42)
        })

        const moduleB = createDIModule<{ valueB: number }, TypeMapOfModule<typeof moduleA>>(builder => {
            builder
                .bindInstance('valueB', 256)
        })

        // Act ---------
        const builder = DIContainer.builder()
            .useModule(moduleA)
            .useModule(moduleB)

        const hasModuleA = builder.hasModule(moduleA)
        const hasModuleB = builder.hasModule(moduleB)

        const bindingValueA = builder.findBindingOf('valueA')
        const bindingValueB = builder.findBindingOf('valueB')

        // Assert ------
        expect(hasModuleA).toBeTruthy()
        expect(hasModuleB).toBeTruthy()
        expect(bindingValueA).not.toBeNull()
        expect(bindingValueA?.instance).toBe(42)
        expect(bindingValueB).not.toBeNull()
        expect(bindingValueB?.instance).toBe(256)
    })

    it('Override binding on conflict', () => {
        // Arrange -------
        const originValue = 'Foo'
        const expectedValue = 'Bar'
        const builder = DIContainer.builder<{ typeKey: string }>()
            .bindInstance('typeKey', originValue)

        // Act -----------
        builder.bindInstance('typeKey', expectedValue, { conflict: 'override' })

        const actualBinding = builder.findBindingOf('typeKey')
        const bindings = builder.getAllBindingsOf('typeKey')

        // Assert --------
        expect(actualBinding?.instance).toBe(expectedValue)
        expect(bindings.length).toBe(1)
    })


    it('Skip binding on conflict', () => {
        // Arrange ------
        const expectedValue = 'Foo'
        const newValue = 'Bar'

        const builder = DIContainer.builder<{ typeKey: string }>()
            .bindInstance('typeKey', expectedValue)

        // Act ----------
        builder.bindInstance('typeKey', newValue, { conflict: 'skip' })

        const actualBinding = builder.findBindingOf('typeKey')
        const bindings = builder.getAllBindingsOf('typeKey')

        // Assert -------
        expect(actualBinding?.instance).toBe(expectedValue)
        expect(bindings.length).toBe(1)
    })

    it('Throw on binding conflict', () => {
        // Arrange ------
        const firstValue = 'Foo'
        const secondValue = 'Bar'

        const builder = DIContainer.builder<{ typeKey: string }>()
            .bindInstance('typeKey', firstValue)

        let error: BindingConflictDIError | null = null

        // Act ----------
        try {
            builder.bindInstance('typeKey', secondValue, { conflict: 'throw' })
        } catch (err) {
            if (err instanceof BindingConflictDIError)
                error = err
        }

        // Assert -------
        expect(error).not.toBeNull()
        expect(error?.message).toContain('typeKey')
    })
})