export const log = {
  debug: (msg: any, ...args: any[]) => {
    if (process.env.NODE_SLS_HELPERS_DEBUG) {
      console.debug('[SLS_HELPERS]', msg, ...args);
    }
  }
};
