const globalInitializers: Function[] = [];

export const runInitializers = async () => {
  return Promise.all(globalInitializers.map(initializer => initializer()));
};

export const init = (initializer: Function) => {
  globalInitializers.push(initializer);
};
