# Модули DI контейнера
Если создавать привязки в одном файле конфигурации DI,
то получится огромный JS/TS-файл состоящий из кучи привязок
и огромного количества импортов со всего кода приложения.

В последствии, такую конфигурацию будет сложно поддерживать.

Для решения этой проблемы, была добавленная поддержка разделения
конфигурации на небольшие модули.
Работа с такими модулями не отличается от работы
с обычной конфигурацией контейнера.

Каждый модуль имеет собственную карту типов.
После подключения модуля к контейнеру, он наследует карту типов модуля.

Модули разделяются на два типа: Статические и Динамические

## Статические модули
Статические модули - используются для выделения части конфигурации в отдельный файл.

При подключении к DI-контейнеру ведут себя так же,
как если бы их содержание напрямую писалось в конфигурации.

Подключение к контейнеру выполняется с помощью метода `addModule()`.

```ts
/* ---- network/module.ts ---- */
import { HttpClient } from './services/HttpClient'

// Определяем модуль для работы с сетью
export const networkModule = DIModule.static('network-module')
    .create<{
        baseUrl: string
        apiKey: string
        httpClient: HttpClient
    }>(builder =>
        // Конфигурируем привязки модуля    
        builder
            .bindInstance('baseUrl', 'https://example.com/api/v1')
            .bindInstance('apiKey', '44AAAA-BBBB-CCCCCCCC-112233')
            .bindFactory('httpClient', c => 
                new HttpClient(
                    c.get('baseUrl'),
                    c.get('apiKey'),
                )
            )
    )


/* ---- container.ts ---- */
import { networkModule } from '../modules/network/module'

export const buildContainer = () =>
    // Основная конфигурация контейнера
    DIContainer.builder()
        .addModule(networkModule) // Добавляем модуль
        .build()
```

В этом примере, был выделен модуль для работы с сетью.
Это позволило собрать все объекты и значения связанные с сетью
сгруппировать в одном месте, что упрощает дальнейшую поддержку.

Такой модуль можно выделить в отдельный NPM-пакет и переиспользовать
в разных приложениях.


## Динамические модули
Динамические модули - используются, когда требуется динамически
подгружать часть приложения.

То есть, когда приложение ничего не знает о типах модуля,
на момент конфигурации контейнера.

Для загрузки используются динамические импорты.

```ts
// Импортируем типы, не сущности
import type { NewsStore, NewsService, NewsGateway } from '@app/news'

export const newsModule = DIModule.dynamic(
    'news-module',
    () => import('@app/news'), // Динамический импорт
).create<{
    newsStore: NewsStore,
    newsService: NewsService,
    newsGateway: NewsGateway,
}>((builder, { NewsStore, NewsService, NewsGateway }) =>
    // Конфигцрация модуля    
    builder
        .bindFactory('newsStore', () => new NewsStore())
        .bindFactory('newsGateway', () => new NewsGateway())
        .bindFactory('newsService', c => 
            new NewsService(
                c.get('newsStore'),
                c.get('newsGateway'),
            ),
        )
)
```

Добавление к контейнеру выполняется так же, как статические модули:
```ts
import { newsModule } from './dynamic/news'

function buildContainer() {
    return DIContainer.builder()
        .addModule(newsModule) // Добавление динамического модуля 
        .build()
}
```

### Загрузка динамических модулей
Если попытаться сразу после создания контейнера,
получить экземпляр из динамического модуля,
то контейнер бросит ошибку:
`DIError: Module "news-module" not loaded`

Чтобы исправить ее, нужно попросить контейнер загрузить этот модуль.

```ts
await container.loadModuleAsync(newsModule)
```
Эта операция импортирует модуль в контейнер, и все его сущности будут готовы к использованию.

Если нужно передать экземпляр сущности динамического модуля
без выполнения загрузки, можно использовать отложенную инъекцию.


## Зависимости модулей
Модулю могут потребоваться зависимости от других модулей.
Для этого нужно передать карту типов этих модулей,
чтобы можно было обратиться к ним.

Карта типов передается во втором Generic-параметре функции `create`.
Карту типов модуля можно узнать с помощью специального типа `TypeMapOfDIModule<Module>`.

```ts
import { storageModule } from '../storage'
import { networkModule } from '../network'
import { NewsStore, NewsGateway, NewsService } from './services'

// Определяем карту типов этого модуля
type ModuleTypeMap = {
    newsStore: NewsStore
    newsGateway: NewsGateway,
    newsService: NewsService,
}

// Определяем карту типов от которых модуль зависит
type DependenciesTypeMap = 
    | TypeMapOfDIModule<typeof storageModule>
    | TypeMapOfDIModule<typeof networkModule>

export const newsModule = DIModule.static('news-module')
    .create<ModuleTypeMap, DependenciesTypeMap>(builder => 
        builder
            .bindFactory('newsStore', c =>
                new NewsStore(
                    c.get('presistStorage'), // Из 'storageModule'
                ),
            )
            .bindFactory('newsGateway', c => 
                new NewsGateway(
                    c.get('httpClient'), // Из 'networkModule'
                ),
            )
            .bindFactory('newsService', c => 
                new NewsService(
                    c.get('newsStore'),
                    c.get('newsGateway'),
                ),
            )
    )
```

### Требование зависимостей
Хоть мы и определили карту типов, от которых зависит модуль.
Может случиться так, что контейнер не имеет этих типов.

Для этого можно потребовать у контейнера проверить наличие этих типов,
с помощью метода `requireType`:

```ts
// ...
export const newsModule = DIModule.static('news-module')
    .create<ModuleTypeMap, DependenciesTypeMap>(builder =>
        builder
            // Требуем у контейнера наличие типов
            .requireType('presistStorage')
            .requireType('httpClient')
            // ...
    )
```

При создании контейнера будет выполнена проверка,
что все требуемые типы были привязаны.
Если нет, то процесс создания контейнера упадет с ошибкой,
что позволит сразу ее обнаружить и исправить,
не дожидаясь падения когда-то во время работы приложения.

Так же можно использовать требование для конфигурации модуля,
чтобы работать с ним как с "черным ящиком".
```ts
/* ---- networkModule.ts ---- */
export const networkModule = DIModule.static('network-module')
    .create<{
        baseUrl: string,
        httpClient: HttpClient,
    }>(builder => 
        builder
            // Делегируем предоставление привязки
            // 'baseUrl' на контейнер
            .requireType('baseUrl')
            .bindFactory(
                'httpClient', 
                c => new HttpClient(c.get('baseUrl')),
            )
    )


/* ---- container.ts ---- */
import appConfig from './app-config.json'

export const buildContainer = () =>
    DIContainer.builder()
        .addModule(networkModule)
        // Предоставляем 'baseUrl', который требует 'networkModule'
        .bindInstance('baseUrl', appConfig.baseUrl)
        .build()
```
