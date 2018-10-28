import {APIGatewayProxyEvent} from 'aws-lambda';
import {handle} from 'node-serverless-helpers';

export const helloWorld = handle(async (event: APIGatewayProxyEvent) => {
    return 'hello lambda world';
})
