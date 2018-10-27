const globalInitializers: Function[] = [];

export const init = async () => {
    return Promise.all(globalInitializers.map(init => init()));
};

export const register = (init: Function) => {
    globalInitializers.push(init);
}
