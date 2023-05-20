# SpireX DI
Библиотека реализующая инъекцию зависимостей для JS/TS проектов.

## Зачем?

- Простой и быстрый старт в любом проекте
- Независимость инфраструктуры проекта от библиотеки
- Нет глобальных божественных объектов
- Расширяемость

## Что может?

- Строгая типизация и не изменяемый контейнер
- Использование значений и фабрик для инъекции
- Управление жизненным циклом экземпляров приложения
- Инъекция по имени
- Условная конфигурация
- Отложенная инъекция (Provider / Lazy)
- Разделение конфигурации контейнера на модули
- Автоматическая утилизация экземпляра области, при ее закрытии
- Автоопределение циклический зависимостей

## Быстрый старт

### Шаг 1. Определение типов
К сожалению JS/TS нет типов во время выполнения, нужно определить свои "ключи" типов.
Например, можно использовать строковый enum:

```ts
export enum AppType {
    AppManager = 'AppManager',
    HttpClient = 'HttpClient',
    ApiBaseUrl = 'ApiBaseUrl',
    Logger = 'Logger',
}
```

### Шаг 2. Карта типов (только для TypeScript)
Чтобы DI-контейнер понимал с какими типами он имеет дело, ему нужно описать карту типов.
В ней указывается связь ключа и конкретного типа:

```ts
import { IAppManager } from '../modules/app/abstract'
import { IHttpClient } from '../modules/network/abstract'
import { ILogger } from '../logger'

export type AppTypeMap = {
    [AppType.AppManager]: IAppManager;
    [AppType.HttpClient]: IHttpClient;
    [AppType.ApiBaseUrl]: string;
    [AppType.Logger]: ILogger;
}
```

### Шаг 3: Конфигурация контейнера
Конфигурация контейнера выполняется с помощью "сборщика".
Сборщик требует предоставить Generic-параметр *TypeMap* для типизации контейнера. 
Для этого используются привязки фабрик и зкземпляров определенного типа.

Функция фабрики принимает "resolver" в качестве параметра.
С помощью него можно запросить необходимые зависимости для постоения типа.
```ts
import { DIContainer } from 'spx-di'
import { AppManager } from '../modules/app'
import { ConsoleLogger, NetworkLogger } from '../logger'
import { HttpClient } from '../modules/network'

const container = DIContainer.builder<AppTypeMap>()
    // Привязываем фабрику предоставляющую `AppManager`
    .bindFactory(
        AppType.AppManager,
        r => new AppManager(
            r.get(AppType.HttpClient),  // требует HttpClient
            r.get(AppType.Logger),      // требует Logger
        ),
    )
    
    // Привязываем значение `ApiBaseUrl`
    .bindInstance(
        AppType.ApiBaseUrl,
        "https://example.com/api" // Значение которое будет предоставлено
    )
    
    // Условная привязка
    // "when" влияет только на следующий вызов bindFactory/bindInstance 
    .when(NODE_ENV !== 'production') // Если в среде разработки
        .bindFactory(
            AppType.Logger,
            () => new ConsoleLogger(), // Используем ConsoleLogger
        )
    .when(NODE_ENV === 'production') // В реальной среде
        .bindFactory(
            AppType.Logger,
            r => new NetworkLogger(        // Используем сетевой логгер
                r.get(AppType.HttpClient), // он требует HttpClient
            ),
        )
    .bindFactory(
        AppType.HttpClient,
        r => new HttpClient(
            r.get(AppType.ApiBaseUrl),
        ),
    )
    .build() // Завершаем конфигурацию и создаем контейнер

// Определяем тип контейнера, чтобы ссылаться на него в приложении
export type AppContainer = typeof container
```
После постоения контейнера, он готов к использованию в приложении.

Конфигурацию постоенного контейнера нельзя изменить.
Это дает строгую типизацию контейнера
и обезопасит приложение от возможных ошибой связанных с динамической конфигурацией


### Шаг 4: Использование контейнера
Контейнер готов, теперь можно попросить необходимый сервис и использовать его:
```ts
function main(container: AppContainer) {
    // Запрашиваем экземпляр AppManager
    const app = container.get(AppType.AppManager)
    
    // Используем полученный экземпляр
    app.run()
}
```