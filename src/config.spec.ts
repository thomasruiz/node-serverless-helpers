import { config, getConfig } from './config';

describe('config', () => {
  it('changes the default options', () => {
    config({api: {blacklist: []}});
    expect(getConfig()).toStrictEqual({api: {blacklist: []}});
  });
});
