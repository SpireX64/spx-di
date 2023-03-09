import DIError from './DIError'
import IEntityBinding, { getStringName } from '../abstract/IEntityBinding'

export default class DependencyCycleDIError extends DIError {
    public constructor(activationChain: readonly IEntityBinding<any, any>[]) {
        const graph = activationChain.map(it => {
            let typeName = getStringName(it.type)
            if (it.name != null)
                typeName += `:${getStringName(it.name)}`
            return typeName
        }).join(' -> ')
        super(`Dependency cycle [${graph}]`);
    }
}
