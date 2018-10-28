import {
    APIGatewayEvent,
    APIGatewayProxyCallback,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';

export default (next: APIGatewayProxyHandler): APIGatewayProxyHandler => {
    return async (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback): Promise<APIGatewayProxyResult> => {
        try {
            await normalize(event);
            return format(event, await next(event, context, callback));
        } catch (err) {
            return formatError(err);
        }
    };
}

const normalize = async (event: APIGatewayEvent) => {
    if (['POST', 'PUT', 'PATCH'].indexOf(event.httpMethod) > -1) {
        event.body = event.body || '{}';
        try {
            event.body = JSON.parse(event.body);
        } catch (e) {
            throw {
                statusCode: 400,
                body: 'Bad Request',
            };
        }
    }
};

const format = async (event: APIGatewayEvent, content: any): Promise<APIGatewayProxyResult> => {
    return {
        statusCode: content ? httpMethodToStatus(event.httpMethod) : 204,
        body: content ? JSON.stringify(content, (key, value) => {
            return ['password'].indexOf(key) > -1 ? undefined : value;
        }) : '',
    };
};

const httpMethodToStatus = (method: string): number => {
    switch (method) {
        case 'POST':
            return 201;
    }

    return 200;
};

const formatError = async (err: any): Promise<APIGatewayProxyResult> => {
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
        statusCode: err.statusCode || 500,
        body: err.statusCode ? err.body : 'Internal Server Error',
    };
};
