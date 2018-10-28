import {init, register} from './init';

describe('init', () => {
    it('registers init functions without calling them', () => {
        let called = false;
        register(async () => called = true);
        expect(called).toBe(false);
    });

    it('calls registered init functions', async () => {
        let called = false;
        register(async () => called = true);
        await init();
        expect(called).toBe(true);
    });
});
