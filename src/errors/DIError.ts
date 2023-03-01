export default class DIError {
    public readonly stack: string = ''
    public readonly innerError: DIError | Error | null = null
    public constructor(
        public readonly message: string,
        innerError: DIError | Error | null = null,
    ) {
        this.innerError = innerError ?? null
        Error.captureStackTrace(this, DIError)
    }
}
