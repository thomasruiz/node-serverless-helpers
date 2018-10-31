import {config, internalConfig} from './config';

describe('config', () => {
    it('changes the default options', () => {
        config({api: {blacklist: []}});
        expect(internalConfig).toStrictEqual({api: {blacklist: []}})
    })
})
