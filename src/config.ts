import { all as merge } from 'deepmerge';

export interface ApiConfigCorsOptions {
  origin: string;
  credentials: boolean;
  methods: string[];
  allowHeaders: string[];
  exposeHeaders: string[];
  maxAge: string;
}

export interface ApiConfigOptions {
  cors: boolean | ApiConfigCorsOptions;
  blacklist: string[];
};

export interface ConfigOptions {
  api: ApiConfigOptions;
}

let internalConfig: ConfigOptions = {
  api: {
    blacklist: [],
    cors: false,
  },
};

export const config = (options: ConfigOptions): void => {
  internalConfig = merge([internalConfig, options]) as ConfigOptions;
};

export const getConfig = (): ConfigOptions => internalConfig;
