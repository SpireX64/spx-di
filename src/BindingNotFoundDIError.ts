import DIError from './DIError'

export default class BindingNotFoundDIError extends DIError {
    public constructor(public readonly type: string) {
        super(`Binding of type "${type}" not found`);
    }
}
