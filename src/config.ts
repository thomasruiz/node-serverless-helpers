import {all as merge} from 'deepmerge';

export interface ApiConfigOptions {
    blacklist?: string[];
};

export interface ConfigOptions {
    api?: ApiConfigOptions;
};

export let internalConfig: ConfigOptions = {};

export const config = (options: ConfigOptions): void => {
    internalConfig = merge([internalConfig, options]);
};
