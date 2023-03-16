# 2.6 Области доступности
Контейнер поддерживает области доступности.
Это позволяет иметь один экземпляр типа на область.

## Scoped Жизненный цикл
Если требуется, чтобы экземпляр существовал только в пределах области,
то можно задать ему жизненный цикл `Scoped` при конфигурации контейнера:

```ts
builder
    .bindFactory(
        Types.MyType,
        () => new MyTypeImpl(),
        Lifecycle.Scoped, // Ограничен областью доступности
    )
```
Когда область будет закрыта, все ссылки на экземпляры, что хранятся в данной области, будут удалены.

## Создание областей
Область создается при первом обращении к ней с помощью метода `scope()`:
```ts
declare function scope(key: TScopeKey): IDependencyResolver
```
где,
- `key` - Уникальный идентификатор (ключ) области.
  Может принимать значения типов `string` и `symbol`.

После вызова, возвращает объект будет предоставлять экземпляры из этой области.
При повторном вызове с тем же ключом, если область не была закрыта, вернется тот же объект.

## Закрытие области
Если область доступности больше не нужна,
то ее нужно закрыть с помощью метода `closeScope`:
```ts
declare function disposeScope(scopeKey: TScopeKey): void
```

После чего область будет закрыта и все ссылки на ее экземпляры
будут удалены из контейнера.

Если обратится к области после ее закрытия,
будет создана новая область с новыми экземплярами.

```ts
const instA1 = container.scope('A').get(Types.MyType)

container.disposeScope('A') // Закрываем область 'A'
// Все экземпляры области 'A' были удалены из контейнера

const instA2 = container.scope('A').get(Types.MyType)
// Была создана новая область 'A'
// Создан новый экземпляр 'MyType' в новой области 'A'

console.assert(instA1 !== instA2) // разные экземпляры
```

## Глобальная область
При создании контейнера, с ним создается и глобальная область.
В основном в ней хранятся все экземпляры с жизненными циклами `Singleton` и `LazySingleton`,
Но так же и `Scoped` экземпляры, созданные в этой области.

_Глобальную область невозможно закрыть._

Если запросить `Scoped` экземпляр в глобальной области,
его жизненный цикл будет вести себя как `LazySingleton`.
При этом теряется возможность удалить такой экземпляр.

Ключ глобальной области можно получить из статической переменной контейнера: `DIContainer.globalScopeKey`.

Когда мы просим контейнер предоставить какой-либо экземпляр,
он обращается к этой самой глобальной области.
То есть следующие вызовы идентичны:
```ts
container.get(Types.MyService)
container.scope(DIContainer.globalScopeKey).get(Types.MyService)
```

## Получение экземпляров в области
После создания области, можно попросить ее предоставить необходимый экземпляр.
Жизненный цикл `Scoped` гарантирует, что будет создан только один экземпляр типа в пределах одной области.

Singleton-экземпляры принадлежат только глобальной области.
Transient-экземпляры не могут принадлежать областям.

```ts
const instA = container.scope('my-scope').get(Types.MyType)
const instB = container.scope('my-scope').get(Types.MyType)
const instC = container.scope('other').get(Types.MyType)

console.assert(instA === instB) // Один и тот же экземпляр
console.assert(instA !== instC) // Разные экземпляры
```

## Ограничение получения экземпляров в области
Контейнер умеет ограничивать возможность получать экземпляры типа определенной областью.
Например, чтобы получить гарантию, что он используется только в ней.

Для этого у привязки есть опция `scope`, где можно указать ключ области,
в которой экземпляр может быть получен.

При этом экземпляр может иметь любой жизненный цикл. Опция `scope` ограничивает только то, где можно получить экземпляр, 
но не влияет на жизненный цикл самого экземпляра.

```ts
const container = builder
    .bindFactory(
        Types.MyType,
        () => new MyTypeImpl(),
        Lifecycle.LazySingleton, // жизненный цикл не ограничен областью
        { scope: 'my-scope' },   // получение ограничего областью "my-scope"
    )
    .build()

container.scope('my-scope').get(Types.MyType) // OK
container.scope('other-scope').get(Types.MyType) // DIError: Binding of type "MyType" not found in scope "other-scope"
container.get(Types.MyType) // Error: Binding of type "MyType" not found in scope "global"
```

Можно указать массив ключей, чтобы дать доступ к экземпляру из нескольких областей:

```ts
const container = builder
    .bindInstance(
        Types.SecureKey,
        'AAAAAAA-AAAAA-AAAAA-AAAAAAAAA',
        { scope: ['A', 'B'] }, // Доступно только в областях 'A' и 'B'
    )
    .build()

container.scope('A').get(Types.SecureKey) // OK
container.scope('B').get(Types.SecureKey) // OK
container.scope('C').get(Types.SecureKey) // DIError: Binding of type "SecureKey" not found in scope "C"
container.get(Types.SecureKey) // DIError: Binding of type "SecureKey" not found in scope "global"
```

### Получение объекта для закрытия области
Области может закрывать только контейнер. 
Но при этом не хотелось бы передавать ссылку на контейнер,
чтобы компоненты не могли произвольно получать любые экземпляры из него.

Поэтому контейнер может предоставить делегат "IScopeDisposable",
который может закрыть область без помощи контейнера.

```ts
interface IScopeDisposable {
    readonly scopeKey: TScopeKey

    isScopeDisposed(): boolean
    
    dispose(): void
}
```
- `scopeKey` - ключ области на которую он ссылается;
- `isScopeDisposed` - проверяет, была ли область закрыта;
- `dispose` - выполняет закрытие области.

Получить такой делегат можно напрямую из контейнера:
```ts
container.getScopeDisposable(scopeKey)
```
Или с помощью фабрики, при создании экземпляра:
```ts
builder
    .bindFactory(
        'myService',
        r => new MyService(
            r.getScopeDisposable(),
        ),
        Lifecycle.Scoped,
    )
```
Фабрика предоставляет `IScopeDisposable` области, которой принадлежит текущий экземпляр.
То есть экземпляр должен быть ограничен этой областью или он должен быть с жизненным циклом "Scoped" и должен быть создан в ней.

```ts
const container = builder
    .bindFactory('service1', () => {}, Lifecycle.Singleton)
    .bindFactory('service2', () => {}, Lifecycle.Scoped)
    .bindFactory('service3', () => {}, Lifecycle.Singleton, { scope: 'foo' })
    .build()

const s1 = container.scope('foo').get('service1') // Принадлежит области global
const s2 = container.get('service2')              // Принадлежит области global
const s3 = container.scope('foo').get('service2') // Принадлежит области 'foo'
const s4 = container.scope('foo').get('service3') // Принадлежит области 'foo'
```

### Авто-очистка экземпляров
Контейнер поддерживает механизм авто-очистки экземпляров,
при закрытии области в которой они были созданы.

Это может помочь очистить используемые ресурсы
или обновить состояние других экземпляров при закрытии области.

Чтобы реализовать такое поведение, нужно создать метод
`dispose` у экземпляра.
Если контейнер обнаружит метод с таким именем у экземпляра,
он будет вызван автоматически, при закрытии области.

Например, есть класс музыкального плеера,
который позволяет открывать и воспроизводить музыкальные файлы.

Он используется только в определенном разделе приложения.
Поэтому при выходе из этого раздела, нужно остановить воспроизведение
и закрыть музыкальный файл.
Если этого не сделать, мы потеряем ссылку на плеер
и музыка продолжит играть без возможности остановить ее.
```ts
// ---[ MusicPlayer.ts ]------------------------
class MusicPlayer implements IMediaPlayer {
    // ... 
    
    public dispose(): void {
        // Если вышли из области, где экземпляр плеера доступен
        // останавливаем воспроизведение и закрываем музыкальный файл
        if (this.isFileReady) {
            if (this.isPlaying) this.stop()
            this.closeFile()
        }
    }
}

// ---[ di.ts ]---------------------------------
const Types = {
    MediaPlayer: IMediaPlayer,
}

type TypeMap = {
    [Types.MediaPlayer]: IMediaPlayer;
}

function buildContainer() {
    return DIContainer.builder<TypeMap>()
        .bindFactory(
            Types.MediaPlayer,
            () => new MusicPlayer(),
            Lifecycle.Scoped, // Ограничен областью
        )
        .build()
}

// ---[ main.ts ]-------------------------------
function main() {
    const container = buildContainer()
    const player = container.scope('music').get(Types.MediaPlayer)
    player.open('music.ogg')
    player.play()
    
    container.closeScope('music') // Закрываем область "music"
    // MusicPlayer.dispose() был вызыван
}
```
