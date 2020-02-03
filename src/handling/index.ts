import { APIGatewayProxyHandler, Callback, Context, Handler } from 'aws-lambda';

import { runInitializers } from '../init';
import { apiHandler, ApiHandler } from './api';
import {log} from '../debug';

let initPromise: Promise<any>;
let callInit = true;

const isApi = (event: any): false | ((next: ApiHandler) => APIGatewayProxyHandler) => {
  return event.pathParameters !== undefined ? apiHandler : false;
};

export type DefaultHandler = (event: any, context: any) => Promise<any>;

export const handle = (next: ApiHandler | DefaultHandler, shouldThrowOnUnhandled = true): Handler => {
  log.debug('[HANDLE] Handling event with function', next.name);
  if (callInit) {
    log.debug('[HANDLE] Calling initializers');
    callInit = false;
    initPromise = runInitializers();
  }

  return async (event: any, context: Context, callback: Callback): Promise<any> => {
    await initPromise;
    log.debug('[HANDLE] Initializers ran successfully');
    log.debug('[HANDLE] Is API Gateway handler', event.pathParameters !== undefined);
    for (const check of [isApi]) {
      const result = check(event);
      if (result) {
        return result(next)(event, context, callback);
      }
    }

    if (!shouldThrowOnUnhandled) {
      log.debug('[HANDLE] Using default handler');
      return (next as DefaultHandler)(event, context);
    }
    log.debug('[HANDLE] Unhandled event !');
    throwUnhandledEvent();
  };
};

const throwUnhandledEvent = () => {
  console.log('unhandled event');
  const error = new Error('Unhandled event');
  error.name = 'UnhandledEvent';
  throw error;
};
