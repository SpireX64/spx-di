import {DIError, DIErrorType} from "../src";

describe('DIError', () => {
    it('Create DIError instance with constructor', () => {
        const errorMessage = 'Lorem ipsum dolor'
        const innerError = Error(errorMessage)
        const error = new DIError(DIErrorType.IllegalState, errorMessage, innerError)

        expect(error.errorType).toBe(DIErrorType.IllegalState)
        expect(error.message).toBe(errorMessage)
        expect(error.innerError).toBe(innerError)
        expect(error.toString()).toContain(`DIError: ${errorMessage}`)
    })

    it('Create DIError instance with factory method', () => {
        const errorMessage = 'Lorem ipsum dolor'
        const innerError = Error(errorMessage)
        const error = DIError.illegalState(errorMessage, innerError)

        expect(error.errorType).toBe(DIErrorType.IllegalState)
        expect(error.message).toBe(errorMessage)
        expect(error.innerError).toBe(innerError)
        expect(error.toString()).toContain(`DIError: ${errorMessage}`)
    })
});