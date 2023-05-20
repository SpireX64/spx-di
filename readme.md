# SPX-DI
Dependency injection library for JS/TS projects.

## Why?
- Easy and fast integration into a project of any complexity
- Independence of the project infrastructure from the DI library
- No global god-objects
- Expandability

## Features
- Strong typing and secure container
- Using instances and factories for injection
- Instance lifecycle management
- Injection by name
- Conditional configuration
- Delayed dependency injection (Provider / Lazy)
- Splitting container configuration into modules
- Auto-dispose scoped instances
- Auto-detection of cyclic dependencies

## Quick start

### Step 1. Type definition.
Unfortunately JS/TS doesn't have runtime types, you have to define your own type "keys".
For example, you can use string enum:

```ts
export enum AppType {
    AppManager = 'AppManager',
    HttpClient = 'HttpClient',
    ApiBaseUrl = 'ApiBaseUrl',
    Logger = 'Logger',
}
```

### Step 2. Type map (TypeScript only).
In order for the DI container to understand what types it is dealing with, 
it needs to describe the type map.

It indicates the relationship between the key and a specific type:

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

### Step 3. Container configuration.
Configuration of the container is carried out using a "builder".
The builder requires *TypeMap* generic parameter to be set for the container typing.
Container builder uses "bindings" to bind types with instances and factories.

The factory function takes "resolver" as a parameter.
It can be used to provide required dependencies.

```ts
import { DIContainer } from 'spx-di'
import { AppManager } from '../modules/app'
import { ConsoleLogger, NetworkLogger } from '../logger'
import { HttpClient } from '../modules/network'

const container = DIContainer.builder<AppTypeMap>()
    // Binding a factory function to the `AppManager` type
    .bindFactory(
        AppType.AppManager,
        r => new AppManager(
            r.get(AppType.HttpClient),  // требует HttpClient
            r.get(AppType.Logger),      // требует Logger
        ),
    )

    // Binding a value as `ApiBaseUrl` type
    .bindInstance(
        AppType.ApiBaseUrl,
        "https://example.com/api", // This is the value that will be provided
    )
    
    // Conditional binding
    // The "when" statement only affects the next call of bindFactory/bindInstance
    .when(NODE_ENV !== 'production') // on dev environment
        .bindFactory(
            AppType.Logger,
            () => new ConsoleLogger(), // ConsoleLogger will be used
        )
    .when(NODE_ENV === 'production') // on production environment
        .bindFactory(
            AppType.Logger,
            r => new NetworkLogger(        // NetworkLogger will be used
                r.get(AppType.HttpClient), // it depends on HttpClient
            ),
        )
    .bindFactory(
        AppType.HttpClient,
        r => new HttpClient(
            r.get(AppType.ApiBaseUrl),
        ),
    )
    .build() // Commit configuration and build DIContainer

// Define type of container to refer to in the source code
export type AppContainer = typeof container
```

### Final step 4. Using a dependency injection container.
Now the container is ready, you can request any service and use it:
```ts
function main(container: AppContainer) {
    // Resolve instance of "AppManager"
    const app = container.get(AppType.AppManager)
    
    // Use AppManager instance
    app.run()
}
```