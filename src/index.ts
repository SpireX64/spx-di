export {default as DIContainer, DIContainerBuilder, createDIModule} from './DIContainer'
export { isLazyInstance } from './internal/LazyInstance'
export { default as Lifecycle } from './Lifecycle'
export { default as DIError, DIErrorType } from './DIError'
export type { TypeMapOfContainer, TypeMapOfModule } from './DIContainer'
export type { TProvider, TScopeKey, TInstanceFactory, IDisposable, IScopeDisposable, TConflictResolution, TBindingName, TBindingOptions } from './types'
export type { default as ITypeBinding, checkIsAvailableInScope } from './abstract/ITypeBinding'
export type { default as IDependencyResolver } from './abstract/IDependencyResolver'
