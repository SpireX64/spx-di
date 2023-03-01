import DIError from './DIError'

export default class NullableBindingDIError extends DIError {
    public constructor(public readonly type: string) {
        super(`Unexpected nullable binding of type "${type}"`);
    }
}
