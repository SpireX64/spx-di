import { DIError, DIErrorType } from '../src'

describe('DIError', () => {
    it('Create DIError instance with constructor', () => {
        const errorMessage = 'Lorem ipsum dolor'
        const innerError = Error(errorMessage)
        const error = new DIError(DIErrorType.IllegalState, errorMessage, innerError)

        expect(error.type).toBe(DIErrorType.IllegalState)
        expect(error.message).toBe(errorMessage)
        expect(error.cause).toBe(innerError)
        expect(error.stack).not.toBeUndefined()
        expect(error.toString()).toContain(`DIError.IllegalState: ${errorMessage}`)
    })

    it('Create DIError instance with factory method', () => {
        const errorMessage = 'Lorem ipsum dolor'
        const innerError = Error(errorMessage)
        const error = DIError.illegalState(errorMessage, innerError)

        expect(error.type).toBe(DIErrorType.IllegalState)
        expect(error.message).toBe(errorMessage)
        expect(error.cause).toBe(innerError)
        expect(error.toString()).toContain(`DIError.IllegalState: ${errorMessage}`)
    })
});