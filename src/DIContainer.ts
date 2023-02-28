import IEntityBinding from './IEntityBinding'

export default class DIContainer {
    public static builder<TypeMap extends object>(){
        return new DIContainerBuilder<TypeMap>()
    }
}

export class DIContainerBuilder<TypeMap extends object> {
    private readonly _bindingsMap = new Map<keyof TypeMap, IEntityBinding<TypeMap, keyof TypeMap>>()

    public bindInstance<Type extends keyof TypeMap>(type: Type, instance: TypeMap[Type]): DIContainerBuilder<TypeMap> {
        const binding: IEntityBinding<TypeMap, Type> = {
            type,
            instance,
        }
        this.addBinding(type, binding)
        return this
    }

    public getBindingOfType<Type extends keyof TypeMap>(type: Type): IEntityBinding<TypeMap, Type> | null {
        const binding = this._bindingsMap.get(type)
        if (!binding) return null
        return binding as IEntityBinding<TypeMap, Type>
    }

    public build(): DIContainer {
        return new DIContainer()
    }

    private addBinding<Type extends keyof TypeMap>(type: Type, binding: IEntityBinding<TypeMap, Type>): void {
        this._bindingsMap.set(type, binding)
    }
}