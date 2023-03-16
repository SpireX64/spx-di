# 2.4 Жизненный цикл
Контейнер поддерживает четыре типа жизненных циклов:
- Singleton
- Lazy singleton
- Scoped
- Transient

## Singleton
**Singleton** - дает гарантию того, экземпляр типа будет *создан
сразу* по время создания контейнера и он будет *единственным* экземпляром этого типа.

То есть, когда в программе будет запрашиваться экземпляр этого типа,
будет возвращаться один и тот же экземпляр.

```ts
const container = builder
  .buildFactory(
      Types.MyType,
      () => MyTypeImpl(),
      Lifecycle.Singleton,
  )
  .build() // Здесь создаются все экземпляры
           // с жизненным циклом "Singleton"

const inst1 = container.get(Types.MyType)
const inst2 = container.get(Types.MyType)
console.assert(inst1 === inst2) // Получили один и тот же экземпляр
```

## Lazy Singleton
**Lazy singleton** - как и `Singleton`, гарантирует,
что в контейнере будет только единственный экземпляр такого типа.

Но отличие в том, что `LazySingleton` будет создан только
при первом его запросе у контейнера.

```ts
const container = builder
    .bindFactory(
        Types.MyType,
        () => MyTypeImpl(),
        Lifecycle.LazySingleton,
    )
    .build() // "MyType" все еще не создан
    
// Сразу после того, как "MyType" запрошен
// с помощью "get", контейнер создает его экземпляр
const inst1 = container.get(Type.MyType)
const inst2 = container.get(Types.MyType)
console.assert(inst1 === inst2) // Получили один и тот же экземпляр
```


## Scoped
**Scoped** - гарантирует, что будет создан один экземпляр
в пределах одной области доступности (scope).

То есть он работает аналогично "Lazy Singleton",
но только в определенной части приложения.

```ts
const container = builder
    .bindFactory(
        Types.MyType,
        () => new MyTypeInst(),
        Lifecycle.Scoped,
    )
    .build()

// MyType создан в области 'A'
const instA1 = container.scope('A').get(Types.MyType)
// Экземпляр уже создан в области 'A', поэтому будет переиспользован
const instA2 = container.scope('A').get(Types.MyType)
// MyType создан в области 'B'
const instB = container.scope('B').get(Types.MyType)

console.assert(instA1 === instA2) // Один и тот же экземпляр
console.assert(instA1 !== instB) // Разные экземпляры одного типа
console.assert(instA2 !== instB)
```

Таким образом, можно обеспечить модули разными экземплярами
одного типа, чтобы они не конфликтовали друг с другом во время работы.
Особенно если работа этого типа зависит от внутреннего состояния.

## Transient
**Transient** - гарантирует, что каждый раз когда будет запрошен экземпляр этого типа,
будет создан новый совершенно экземпляр.

Этот тип жизненного цикла ведет себя так же,
как если бы экземпляр был создан с помощью оператора `new`.

Но в отличие от оператора `new`, контейнер возьмет предоставление зависимостей
и создание экземпляра данного типа на себя.

```ts
const container = builder
    .bindFactory(
        Types.MyType,
        r => new MyTypeImpl(
            r.get(Types.MyDependency)
        ),
        Lifecycle.Transient,
    )
    .build()

const inst1 = container.get(Types.MyType)
const inst2 = container.get(Types.MyType)
console.assert(inst1 !== inst2) // Получили разные экземпляры
```
