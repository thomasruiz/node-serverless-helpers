const globalInitializers: Function[] = [];

export const init = async () => {
    return Promise.all(globalInitializers.map(initializer => initializer()));
};

export const register = (initializer: Function) => {
    globalInitializers.push(initializer);
};
