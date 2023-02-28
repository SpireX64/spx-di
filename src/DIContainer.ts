export default class DIContainer {
    public static builder(){
        return new DIContainerBuilder()
    }
}

export class DIContainerBuilder {

    public build(): DIContainer {
        return new DIContainer()
    }
}