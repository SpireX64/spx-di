# 2.6 Отложенная инъекция экземпляра
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

## Lazy
Конечно иногда не хочется добавлять в классы лишние "бэк-поля" и свойства,
чтобы просто получить и хранить экземпляр зависимости.

Контейнер может помочь справиться и с этой рутиной.
Для этого у него есть такой механизм как Lazy-экземпляр.

Это такой Proxy-объект имеющий такой же тип, как и запрашиваемый, 
который при первом обращении/вызове к нему создает настоящий
экземпляр и далее все обращения перенаправляет ему.

Вот так можно переписать предыдущий пример, используя Lazy-экземпляр:
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
            // Запрашиваем не сам 'AccessManager', а Lazy-экземпляр
            r.getLazy('accessManager'),
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
И не приходится думать о том создан ли `AppManager` или нет.

Есть еще одна приятный плюс в использовании `getLazy`.
В том случае, если настоящий экземпляр уже создан,
`getLazy` вернет его вместо Lazy-экземпляра.
Это возможно, потому что типы оригинального и Lazy экземпляров идентичны.

### Проверка на Lazy-экземпляр
Когда требуется проверить является ли текущий экземпляр Lazy,
можно использовать метод `isLazyInstance`.
Он принимает любые значения и возвращает `true`,
если переданное значение это Lazy-экземпляр.

Например, так можно подтвердить гарантию того, что на момент получения
экземпляра зависимости, он еще не был создан.
