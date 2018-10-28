import {init} from '../init';
import api from './api';
import {handle} from './index';
import Mock = jest.Mock;

jest.mock('../init');
jest.mock('./api');

describe('handling', () => {
    describe('handle', () => {
        it('calls init function once', async () => {
            handle(() => null);
            handle(() => null);
            expect((init as Mock).mock.calls.length).toBe(1);
        });

        it('redirects to the api gateway handler correctly', async () => {
            (api as Mock).mockReturnValue(() => expected);

            const expected = {};
            const handler = handle(async () => null);

            const result = await handler({pathParameters: null});

            expect(result).toBe(expected);
        });

        it('throws on unhandled events', async () => {
            let called = false;
            const handler = handle(async () => called = true);

            try {
                await handler({});
            } catch (e) {
                expect(e).toBe('Unhandled event');
                expect(called).toBe(false);
            }
        });

        it('does not throw on unhandled events when shouldThrowOnUnhandled = false', async () => {
            const expected = {};
            const handler = handle(async () => expected, false);

            const result = await handler({});

            expect(result).toBe(expected);
        });
    });
});
