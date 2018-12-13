import {all as merge} from 'deepmerge';

export interface ApiConfigOptions {
    blacklist: string[];
};

export interface ConfigOptions {
    api: ApiConfigOptions;
};

let internalConfig: ConfigOptions = {
    api: {
        blacklist: [],
    },
};

export const config = (options: ConfigOptions): void => {
    internalConfig = merge([internalConfig, options]) as ConfigOptions;
};

export const getConfig = (): ConfigOptions => internalConfig;
