# 2.7 Отложенная инъекция экземпляра
Бывают случаи, когда нужно отложить получение экземпляра.

Например, при запросе экземпляра, даже в качестве зависимости, 
он должен быть создан.
Или экземпляр используется в очень редком случае 
и создавать его в таком случае нет смысла.

А может, возникла циклическая зависимость,
когда создание одного экземпляра требует создание другого.

В таких случаях можно воспользоваться отложенной инъекцией.

## Provider
Первый способ ее реализации - с помощью функции провайдера.

Такая функция уже сконфигурирована на получение экземпляра.
Нужно только ее вызвать, чтобы получить его.

Создать такую функцию можно с помощью метода `getProvider()` у контейнера.
Она имеет такой же интерфейс, как у базового метода `get()`:

Для примера, у нас есть 'IapManager', который требует 'AccessManager',
чтобы проверить доступ пользователя.
При этом не хотелось бы создавать 'AccessManager' с самого старта приложения.
Поэтому тут нужно воспользоваться провайдером,
чтобы отложить создание экземпляра 'AccessManager', до его реального использования:
```ts
const container = DIContainer.builder<{
    'accessManager': IAccessManager
    'iapManager': IIapManager
}>()
    .bindFactory(
        'accessManager',
        () => new AccessManager(),
        Lifecycle.LazySingleton, // Не создавать сразу
    )
    .bindFactory(
        'iapManager',
        () => new IapManager(
            // Запрашиваем не сам 'AccessManager', а его провайдер
            r.getProvider('accessManager'),
        ),
    )
    .build()

class IapManager implements IIapManager {
    private _accessManagerRef: IAccessManager | null
    
    public constructor(
       private readonly accessManagerProvider: () => IAppManager
    ) {}
    
    private get accessManager(): IAccessManager {
        if (this._accessManagerRef == null) {
            // Если у нас еще нет AccessManager,
            // получаем с помощью провайдера и сохраняем
            this._accessManagerRef = this.accessManagerProvider()
        }
        return this._accessManagerRef
    }
    
    public purchase(): void {
        // Обращаемся к AccessManager проверяя доступ
        if (this.accessManager.hasAccess) return
        this.startPurchaseProcess()
    }
    
    // ...
}

// Получаем IapManager. AccessManager все еще не создан
const iapManager = container.get('iapManager')

iapManager.purchase();
// А вот здесь IapManager получает AccessManager
// с помощью провайдера, что приводит к его созданию.
```

То есть мы отложили создание экземпляра до того момента,
как он действительно потребовался.

## Phantom
Конечно не хочется добавлять в классы лишние "бэк-поля" и свойства,
чтобы получить и хранить экземпляр зависимости.

Контейнер помогает справиться и с этой рутиной.
Для этого у него есть такой механизм как Phantom-экземпляр.

Это такой Proxy-объект имеющий такой же тип, как и запрашиваемый, 
который при первом обращении/вызове к нему создает настоящий
экземпляр и далее все обращения перенаправляет ему.

Получить Phantom-экземпляр можно с помощью метода `getPhantom()` у контейнера.
Он принимает такие же параметры как и обычный `get()`.

```ts
declare function getPhantom<Type extends keyof TypeMap>(
    type: Type, 
    name: TBindingName = null,
): TypeMap[Type]
```
где,
- `type` - Ключ-типа, который требуется получить
- `name` - (опц.) имя экземпляра, для получения по имени

Вот так можно переписать предыдущий пример, используя Phantom-экземпляр:
```ts
const container = DIContainer.builder<{
    'accessManager': IAccessManager
    'iapManager': IIapManager
}>()
    .bindFactory(
        'accessManager',
        () => new AccessManager(),
        Lifecycle.LazySingleton, // Не создавать сразу
    )
    .bindFactory(
        'iapManager',
        () => new IapManager(
            // Запрашиваем не сам 'AccessManager', а Phantom-экземпляр
            r.getPhantom('accessManager'),
        ),
    )
    .build()

class IapManager implements IIapManager {
    public constructor(
        private readonly accessManager: IAppManager
    ) {
    }

    public purchase(): void {
        // Обращаемся к AccessManager проверяя доступ
        if (this.accessManager.hasAccess) return
        this.startPurchaseProcess();
    }
}
    // ...
```

Как видно кода стало намного меньше.
И не приходится думать о том создан ли `AccessManager` или нет.

Есть еще приятный плюс в использовании `getPhantom`.
В том случае, если настоящий экземпляр уже создан,
`getPhantom` вернет его вместо Phantom-экземпляра.
Это возможно, потому что типы оригинального и Phantom-экземпляров идентичны.

### Проверка на Phantom-экземпляр
Когда требуется проверить является ли текущий экземпляр Phantom,
можно использовать метод `isPhantomInstance`.
Он принимает любые значения и возвращает `true`,
если переданное значение это Phantom-экземпляр.

Например, так можно подтвердить гарантию того, что на момент получения
экземпляра зависимости, он еще не был создан.

```ts
if (isPhantomInstance(service)) {
    // 'service' - Phantom-экземплр 
} else {
    // 'service' - Реальный экземпляр
}
```
