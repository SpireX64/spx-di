import type {TDynamicDIModule, TModuleKey} from './DIModule'
import { DIError } from '../DIError'

export class DynamicModulesManager {
    private readonly _modulesMap = new Set<TDynamicDIModule<any, unknown>>()
    private readonly _dynamicModulesCache = new Map<TModuleKey, unknown>()

    public addModule(module: TDynamicDIModule<any, unknown>): void {
        this._modulesMap.add(module)
    }

    public async loadModuleAsync(module: TDynamicDIModule<any, unknown>): Promise<void> {
        if (!this._modulesMap.has(module))
            throw DIError.illegalState('Module not found')
        try {
            const jsModule = await module.importDelegate()
            this._dynamicModulesCache.set(module.key, jsModule)
        } catch (e) {
            throw DIError.illegalState('JSModule import failure', e as Error)
        }
    }

    public createDynamicModuleProxy<TypeMap extends object, JSModule>(module: TDynamicDIModule<TypeMap, JSModule>): JSModule {
        const state = {
            module,
            getJSModule: (): JSModule | undefined => this._dynamicModulesCache.get(module.key) as JSModule
        }
        return new Proxy(state, {
            get(target: typeof state, prop: string | symbol): any {
                const jsModule = target.getJSModule()
                if (!jsModule) {
                    return new Proxy(Object, {
                        get(_, p: string | symbol): any {
                            if (p === 'dynamic') return true
                            if (p === 'module') return target.module
                            if (p === 'get') {
                                return () => {
                                    const jsModule = target.getJSModule()
                                    if (!jsModule) throw DIError.illegalState(`Module ${target.module.key.toString()} not loaded`)
                                    // @ts-ignore
                                    return jsModule[prop]
                                }
                            }
                            return undefined
                        },
                        construct(_, argArray: any[]): object {
                            const jsModule = target.getJSModule()
                            if (!jsModule) throw DIError.illegalState(`Module ${target.module.key.toString()} not loaded`)
                            // @ts-ignore
                            const TargetClass = jsModule[prop]
                            // @ts-ignore
                            return new TargetClass(...argArray)
                        },
                        has(_, p: string | symbol): boolean {
                            return p === 'dynamic' || p === 'module' || p === 'get'
                        },
                    })
                }

                // @ts-ignore
                return jsModule[prop]
            }
        }) as JSModule
    }
}