import DIError from './DIError'
import IEntityBinding from '../IEntityBinding'

export default class DependencyCycleDIError extends DIError {
    public constructor(activationChain: readonly IEntityBinding<any, any>[]) {
        const graph = activationChain.map(it => it.type.toString()).join(' -> ')
        super(`Dependency cycle [${graph}]`);
    }
}