import {APIGatewayProxyHandler, Callback, Context} from 'aws-lambda';

import {init} from '../init';
import api from './api';

let initPromise: Promise<any>;

export const handle = (next: (event: any) => any) => {
    if (!initPromise) {
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

        console.log('unhandled event');
        throw 'Unhandled event';
    };
};

const isApi = (event: any): false | ((next: APIGatewayProxyHandler) => APIGatewayProxyHandler) => {
    return event.pathParameters !== undefined ? api : false;
};
