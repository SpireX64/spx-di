import DIError from './DIError'
import { TScopeKey } from '../types'

export default class ClosedScopeDIError extends DIError {
    public constructor(public readonly scopeKey: TScopeKey) {
        super(`Attempt to resolve instance from closed scope ${scopeKey.toString()}`)
    }
}