import {APIGatewayProxyHandler, Callback, Context} from 'aws-lambda';

import {init} from '../init';
import api, {ApiHandler} from './api';

export {ApiHandler} from './api';

let initPromise: Promise<any>;
let callInit = true;

export const handle = (
    next: (event: any, context?: Context, callback?: Callback) => any,
    shouldThrowOnUnhandled = true,
): ((event: any, context?: Context, callback?: Callback) => Promise<any>) => {
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

        if (shouldThrowOnUnhandled) {
            console.log('unhandled event');
            throw 'Unhandled event';
        } else {
            return next(event, context, callback);
        }
    };
};

const isApi = (event: any): false | ((next: ApiHandler) => APIGatewayProxyHandler) => {
    return event.pathParameters !== undefined ? api : false;
};
