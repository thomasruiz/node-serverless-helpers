import 'jest-extended';

import { after, before, callAfterMiddleware, callBeforeMiddleware, HandlingType, MiddlewareList } from './middleware';

describe('handling', () => {
  describe('middleware', () => {
    const testMiddlewareTypes: Array<keyof MiddlewareList> = ['__ALWAYS__', 'ApiGateway'];
    testMiddlewareTypes.forEach((key: HandlingType) => {
      it(`allows registering for ${key}`, () => {
        expect(() => before(key, [async () => {
        }])).not.toThrow();
        expect(() => after(key, [async () => {
        }])).not.toThrow();
      });
    });

    it('runs middlewares in the correct order', async () => {
      const handlers = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()];

      before([handlers[0], handlers[1]]);
      before('ApiGateway', [handlers[2], handlers[3]]);
      after('ApiGateway', [handlers[4], handlers[5]]);
      after([handlers[6], handlers[7]]);

      await callBeforeMiddleware('ApiGateway', []);
      await callAfterMiddleware('ApiGateway', []);

      [1, 2, 3, 4, 5, 6, 7].forEach((i) => expect(handlers[0]).toHaveBeenCalledBefore(handlers[i]));
      [2, 3, 4, 5, 6, 7].forEach((i) => expect(handlers[1]).toHaveBeenCalledBefore(handlers[i]));
      [3, 4, 5, 6, 7].forEach((i) => expect(handlers[2]).toHaveBeenCalledBefore(handlers[i]));
      [4, 5, 6, 7].forEach((i) => expect(handlers[3]).toHaveBeenCalledBefore(handlers[i]));
      [5, 6, 7].forEach((i) => expect(handlers[4]).toHaveBeenCalledBefore(handlers[i]));
      [6, 7].forEach((i) => expect(handlers[5]).toHaveBeenCalledBefore(handlers[i]));
      [7].forEach((i) => expect(handlers[6]).toHaveBeenCalledBefore(handlers[i]));

      [0, 1, 2, 3, 4, 5, 6].forEach((i) => expect(handlers[7]).toHaveBeenCalledAfter(handlers[i]));
      [0, 1, 2, 3, 4, 5].forEach((i) => expect(handlers[6]).toHaveBeenCalledAfter(handlers[i]));
      [0, 1, 2, 3, 4].forEach((i) => expect(handlers[5]).toHaveBeenCalledAfter(handlers[i]));
      [0, 1, 2, 3].forEach((i) => expect(handlers[4]).toHaveBeenCalledAfter(handlers[i]));
      [0, 1, 2].forEach((i) => expect(handlers[3]).toHaveBeenCalledAfter(handlers[i]));
      [0, 1].forEach((i) => expect(handlers[2]).toHaveBeenCalledAfter(handlers[i]));
      [0].forEach((i) => expect(handlers[1]).toHaveBeenCalledAfter(handlers[i]));
    });

    it('registers a middleware without calling it', () => {
      const middleware = jest.fn();

      before('ApiGateway', [middleware]);
      expect(middleware).not.toBeCalled();

      after('ApiGateway', [middleware]);
      expect(middleware).not.toBeCalled();
    });
  });
});
