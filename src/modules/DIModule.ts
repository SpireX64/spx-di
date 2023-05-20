import IContainerConfigurator from "../abstract/IContainerConfigurator";

export type TModuleKey = string | symbol

export type TStaticDIModuleBuildDelegate<TypeMap extends object> = (configurator: IContainerConfigurator<TypeMap>) => void

export type TStaticDIModule<TypeMap extends object> = {
    readonly type: 'static'
    readonly key: TModuleKey
    readonly buildDelegate: TStaticDIModuleBuildDelegate<TypeMap>
}

export type TDynamicDIModuleBuildDelegate<TypeMap extends object, JSModule> = (
    configurator: IContainerConfigurator<TypeMap>,
    module: JSModule,
) => void

export type TDynamicDIModuleImportDelegate<JSModule> = () => PromiseLike<JSModule>

export type TDynamicDIModule<TypeMap extends object, JSModule> = {
    readonly type: 'dynamic'
    readonly key: TModuleKey
    readonly buildDelegate: TDynamicDIModuleBuildDelegate<TypeMap, JSModule>
    readonly importDelegate: TDynamicDIModuleImportDelegate<JSModule>
}

export type TAnyDIModule<TypeMap extends object> = TStaticDIModule<TypeMap> | TDynamicDIModule<TypeMap, any>

export type TypeMapOfDIModule<TModule> = TModule extends TAnyDIModule<infer TypeMap> ? TypeMap : never

export const DIModule = {
    static: (key: TModuleKey) => {
        function create<TypeMap extends object>(
            build: TStaticDIModuleBuildDelegate<TypeMap>,
        ): TStaticDIModule<TypeMap> {
            return {
                key,
                type: 'static',
                buildDelegate: build,
            }
        }
        return { create }
    },
    dynamic: <JSModule>(
        key: TModuleKey,
        importDelegate: TDynamicDIModuleImportDelegate<JSModule>,
    ) => {
        function create<TypeMap extends object = {}>(
            buildDelegate: TDynamicDIModuleBuildDelegate<TypeMap, JSModule>,
        ): TDynamicDIModule<TypeMap, JSModule> {
            return {
                key,
                type: 'dynamic',
                importDelegate,
                buildDelegate,
            };
        }

        return { create }
    },
}
