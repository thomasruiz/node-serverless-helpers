import {
    APIGatewayEvent,
    APIGatewayProxyCallback,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';

import {ApiConfigCorsOptions, getConfig} from '../config';

export type Headers = {[header: string]: boolean | number | string};
export type ApiHandler = (event?: APIGatewayEvent, context?: Context, callback?: APIGatewayProxyCallback) => Promise<any>;

const normalize = async (event: APIGatewayEvent) => {
    if (event.body) {
        try {
            event.body = JSON.parse(event.body);
        } catch (e) {
            throw {
                headers: buildHeaders(event),
                statusCode: 400,
                body: 'Bad Request',
            };
        }
    }
};

const httpMethodToStatus = (method: string): number => {
    switch (method) {
        case 'POST':
            return 201;
        default:
            return 200;
    }
};

const format = async (event: APIGatewayEvent, content: any): Promise<APIGatewayProxyResult> => {
    if (!content) {
        return {headers: buildHeaders(event), statusCode: 204, body: ''};
    }

    if (content.statusCode && content.body) {
        const headers = buildHeaders(event, content.headers);
        return content;
    }

    return {
        headers: buildHeaders(event),
        statusCode: httpMethodToStatus(event.httpMethod),
        body: JSON.stringify(content, (key, value) => {
            return getConfig().api.blacklist.indexOf(key) > -1 ? undefined : value;
        }),
    };
};

const formatError = async (event: APIGatewayEvent, err: any): Promise<APIGatewayProxyResult> => {
    if (err.name === 'ValidationError') {
        console.info(err);
        return {
            statusCode: 422,
            body: JSON.stringify({
                data: err.details,
            }),
        };
    }

    console.error(err);

    return {
        headers: buildHeaders(event),
        statusCode: err.statusCode || 500,
        body: JSON.stringify(err.body ? err.body : 'Internal Server Error'),
    };
};

const buildHeaders = (event: APIGatewayEvent, existingHeaders: Headers = {}): Headers => {
    const headers = {};

    const cors = (getConfig().api.cors === true ? {} : getConfig().api.cors) as ApiConfigCorsOptions;
    if (cors) {
        headers['Access-Control-Allow-Origin'] = cors.origin || event.headers.host;
        headers['Access-Control-Expose-Headers'] = cors.exposeHeaders || Object.keys(existingHeaders).join(', ');
        headers['Access-Control-Allow-Headers'] = cors.allowHeaders || Object.keys(event.headers).join(', ');
    }

    return headers;
};

export default (next: ApiHandler): APIGatewayProxyHandler => {
    return async (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback): Promise<APIGatewayProxyResult> => {
        try {
            await normalize(event);
            return format(event, await next(event, context, callback));
        } catch (err) {
            return formatError(event, err);
        }
    };
};
