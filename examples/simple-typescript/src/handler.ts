import {APIGatewayProxyEvent} from 'aws-lambda';
import {handle} from 'node-serverless-helpers';

export const helloWorld = handle(async (event: APIGatewayProxyEvent): Promise<string> => {
    return `hello lambda world. Called from ${event.path}`;
})
