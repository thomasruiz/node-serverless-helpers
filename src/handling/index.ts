import { APIGatewayProxyHandler, Callback, Context, Handler } from 'aws-lambda';

import { init } from '../init';
import { apiHandler, ApiHandler } from './api';

let initPromise: Promise<any>;
let callInit = true;

const isApi = (event: any): false | ((next: ApiHandler) => APIGatewayProxyHandler) => {
  return event.pathParameters !== undefined ? apiHandler : false;
};

export const handle = (
  next: (event: any, context?: Context) => any,
  shouldThrowOnUnhandled = true,
): Handler => {
  if (callInit) {
    callInit = false;
    initPromise = init();
  }

  return async (event: any, context: Context, callback: Callback): Promise<any> => {
    await initPromise;

    for (const check of [isApi]) {
      const result = check(event);
      if (result) {
        return result(next)(event, context, callback);
      }
    }

    if (!shouldThrowOnUnhandled) {
      return next(event, context);
    }

    throwUnhandledEvent();
  };
};

const throwUnhandledEvent = () => {
  console.log('unhandled event');
  const error = new Error('Unhandled event');
  error.name = 'UnhandledEvent';
  throw error;
};
