import IContainerConfigurator, {TBindingsFilter} from '../abstract/IContainerConfigurator'
import { TBindingOptions, TInstanceFactory } from '../types'
import Lifecycle from '../Lifecycle'

export default class ConditionalConfigurator<TypeMap extends object, BaseConfigurator extends IContainerConfigurator<TypeMap>> implements IContainerConfigurator<TypeMap> {
    public constructor(private readonly configurator: BaseConfigurator, public readonly condition: boolean) {}

    bindFactory<Type extends keyof TypeMap>(type: Type, factory: TInstanceFactory<TypeMap, Type>, lifecycle?: Lifecycle, options?: TBindingOptions): BaseConfigurator {
        if (this.condition)
            this.configurator.bindFactory(type, factory, lifecycle, options)
        return this.configurator
    }

    bindInstance<Type extends keyof TypeMap>(type: Type, instance: TypeMap[Type], options?: TBindingOptions): BaseConfigurator {
        if (this.condition)
            this.configurator.bindInstance(type, instance, options)
        return this.configurator
    }

    requireType<Type extends keyof TypeMap>(type: Type, filter: TBindingsFilter): BaseConfigurator {
        if (this.condition)
            this.configurator.requireType(type, filter)
        return this.configurator
    }

    when(condition: boolean): ConditionalConfigurator<TypeMap, BaseConfigurator> {
        return new ConditionalConfigurator<TypeMap, BaseConfigurator>(this.configurator, condition)
    }
}