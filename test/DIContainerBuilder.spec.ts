import {
    createDIModule,
    DIContainer,
    DIContainerBuilder,
    DIError,
    DIErrorType,
    Lifecycle,
    TypeMapOfModule,
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
        const binding = builder.find('value')

        // Assert -----
        expect(binding).toBeNull()
    })

    it('Get all bindings', () => {
        // Arrange ----
        const valueA = 'foo'
        const valueB = 'bar'
        const builder = DIContainer.builder<{ value: string }>()
        builder.bindInstance('value', valueA, { name: 'A' })
        builder.bindInstance('value', valueB, { name: 'B' })

        // Act --------
        const bindings = builder.getAllBindings()
        const hasValueA = bindings.some(it => it.name === 'A' && it.instance === valueA)
        const hasValueB = bindings.some(it => it.name === 'B' && it.instance === valueB)

        // Assert -----
        expect(hasValueA).toBeTruthy()
        expect(hasValueB).toBeTruthy()
    })

    it('Value binding', () => {
        // Arrange ----
        const expectedValue = 42
        const builder = DIContainer.builder<{value: typeof expectedValue}>()

        // Act --------
        const outBuilder = builder.bindInstance('value', expectedValue)
        const binding = builder.find('value')

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
        const binding = builder.find('typeKey')

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

        const factoryBinding = builder.find('factoryValue')

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
        const binding = builder.find('typeKey')

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
        const requiredExistsType = 'rty'
        const requiredMissingType = 'zxc'
        const builder = DIContainer.builder<{
            foo: string
            bar: string
            qwe: string
            asd: string
            zxc: string
            rty: string
            fgh: string
        }>()

        // Act ---------
        builder
            .when(true).bindInstance('foo', 'FOO')
            .when(false).bindInstance('bar', 'BAR')
            .when(true).bindFactory('asd', () => 'ASD')
            .when(false).bindFactory('zxc', () => 'ZXC')
            .when(true).when(true).bindInstance('rty', 'RTY')
            .when(true).when(false).bindInstance('fgh', 'FGH')
            .bindInstance('qwe', 'QWE')
            .when(true).requireType(requiredMissingType)
            .when(false).requireType(requiredExistsType)

        const fooBinding = builder.find('foo')
        const barBinding = builder.find('bar')
        const asdBinding = builder.find('asd')
        const zxcBinding = builder.find('zxc')
        const rtyBinding = builder.find('rty')
        const fghBinding = builder.find('fgh')
        const qweBinding = builder.find('qwe')

        let error: DIError | null = null
        try {
            builder.build()
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert ------
        expect(fooBinding).not.toBeNull()
        expect(barBinding).toBeNull()
        expect(asdBinding).not.toBeNull()
        expect(zxcBinding).toBeNull()
        expect(rtyBinding).not.toBeNull()
        expect(fghBinding).toBeNull()
        expect(qweBinding).not.toBeNull()

        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.MissingRequiredType)
        expect(error?.message).toContain(requiredMissingType)
    })

    it('Force nullable instance binding', () => {
        // Arrange -----
        const key = 'typeKey'
        const builder = DIContainer.builder<{ [key]: string }>()
        let error: DIError | null = null

        // Act ---------
        try {
            builder.bindInstance(key, null!)
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.NullableBinding)
        expect(error?.message).toContain(key)
    })

    it('Force nullable named instance binding', () => {
        // Arrange -----
        const key = 'typeKey'
        const name = 'test'
        const builder = DIContainer.builder<{ [key]: string }>()
        let error: DIError | null = null

        // Act ---------
        try {
            builder.bindInstance(key, null!, { name })
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.NullableBinding)
        expect(error?.message).toContain(`${key}:${name}`)
    })

    it('Force nullable factory binding', () => {
        // Arrange -----
        const key = 'typeKey'
        const builder = DIContainer.builder<{ [key]: string }>()
        let error: DIError | null = null

        // Act ---------
        try {
            builder.bindFactory(key, null!)
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }
        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.NullableBinding)
        expect(error?.message).toContain(key)
    })

    it('Force nullable named factory binding', () => {
        // Arrange -----
        const key = 'typeKey'
        const name = 'test'
        const builder = DIContainer.builder<{ [key]: string }>()
        let error: DIError | null = null

        // Act ---------
        try {
            builder.bindFactory(key, null!, Lifecycle.Singleton, { name })
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }
        // Assert ------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.NullableBinding)
        expect(error?.message).toContain(`${key}:${name}`)
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

        const bindingDefault = builder.find('typeKey')
        const bindingA = builder.find('typeKey', it => it.name === 'A')
        const bindingB = builder.find('typeKey', it => it.name === 'B')

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

        const bindings = builder.findAllOf('typeKey')

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

        const bindings = builder.findAllOf('typeKey')

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

        const bindings = builder.findAllOf('typeKey')

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
        const string3Factory = () => strings[3]
        builder
            .bindInstance('typeKey', strings[0])
            .bindInstance('typeKey', strings[1])
            .bindInstance('typeKey', strings[2], { name })
            .bindFactory('typeKey', string3Factory, Lifecycle.Singleton, { name, conflict: 'bind' })
            .bindInstance('typeKey', strings[4], { name, conflict: 'bind' })

        const defaultBindings = builder.findAllOf('typeKey')
        const namedBindings = builder.findAllOf('typeKey', it => it.name === name)

        // Assert ------------
        expect(defaultBindings.length).toBe(2)
        expect(namedBindings.length).toBe(3)

        expect(defaultBindings[0].instance).toBe(strings[0])
        expect(defaultBindings[1].instance).toBe(strings[1])

        expect(namedBindings[0].instance).toBe(strings[2])
        expect(namedBindings[1].factory).toBe(string3Factory)
        expect(namedBindings[2].instance).toBe(strings[4])
    })

    it('Throw error on non-singleton binding', () => {
        // Arrange ----
        const builder = DIContainer.builder<{ typeKey: number }>()
        let error: DIError | null = null

        // Act --------
        try {
            builder
                .bindFactory('typeKey', () => 1)
                .bindFactory('typeKey', () => 2, Lifecycle.LazySingleton)
        } catch (e) {
            if (e instanceof DIError)
                error = e
        }

        // Assert -----
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.InvalidMultiBinding)
        expect(error?.message).toMatch(`${Lifecycle.LazySingleton} "typeKey"`)
    })

    it('Separate DI configuration to modules', () => {
        // Arrange -----
        const moduleA = createDIModule<{ valueA: number }>(builder => {
            builder.bindInstance('valueA', 42)
        })

        const moduleB = createDIModule<{ valueB: number }, TypeMapOfModule<typeof moduleA>>(builder => {
            builder.bindInstance('valueB', 256)
        })

        // Act ---------
        const builder = DIContainer.builder()
            .useModule(moduleA)
            .useModule(moduleB)

        const bindingValueA = builder.find('valueA')
        const bindingValueB = builder.find('valueB')

        // Assert ------
        expect(bindingValueA).not.toBeNull()
        expect(bindingValueA?.instance).toBe(42)
        expect(bindingValueB).not.toBeNull()
        expect(bindingValueB?.instance).toBe(256)
    })

    it('Throw if required type binding not bound', () => {
        // Arrange ------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey')

        let error: DIError | null = null

        // Act ----------
        try {
            builder.build()
        } catch (err) {
            if (err instanceof DIError) {
                error = err
            }
        }

        // Assert -------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.MissingRequiredType)
        expect(error?.message).toContain('typeKey')
    })

    it('Throw if required named type binding not bound', () => {
        // Arrange ---------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey', { name: 'foo', scope: '' })
            .requireType('typeKey', { name: 'foo', scope: '' })
            .bindInstance('typeKey', 'Hello')

        // Act -------------
        let error: DIError | null = null

        // Act ----------
        try {
            builder.build()
        } catch (err) {
            if (err instanceof DIError) {
                error = err
            }
        }

        // Assert -------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.MissingRequiredType)
        expect(error?.message).toContain('typeKey:foo')
    })

    it('Throw if required type not provided in scope', () => {
        // Arrange ---------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey', { scope: 'expected' })
            .bindInstance('typeKey', 'Hello', { scope: 'foo' })

        // Act -------------
        let error: DIError | null = null

        try {
            builder.build()
        } catch (err) {
            if (err instanceof DIError) {
                error = err
            }
        }

        // Assert -------
        expect(error).not.toBeNull()
        expect(error?.errorType).toBe(DIErrorType.MissingRequiredType)
        expect(error?.message).toContain('typeKey')
        expect(error?.message).toContain('"expected"')
    })

    it('No throw if required type was provided', () => {
        // Arrange ---------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey')
            .bindInstance('typeKey', 'Hello')

        // Assert ----------
        expect(() => builder.build()).not.toThrow()
    })

    it('No throw if required named type was provided', () => {
        // Arrange ---------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey', { name: 'foo' })
            .bindInstance('typeKey', 'Hello', { name: 'foo' })

        // Assert ----------
        expect(() => builder.build()).not.toThrow()
    })

    it('No throw if required type was provided in scope', () => {
        // Arrange ---------
        const builder = DIContainer.builder<{
            typeKey: string,
        }>()
            .requireType('typeKey', { scope: 'expected' })
            .bindInstance('typeKey', 'Hello', { scope: 'expected' })

        // Assert ----------
        expect(() => builder.build()).not.toThrow()
    })
})