import { APIGatewayProxyEvent, Context } from 'aws-lambda';

export type ApiHandlerEvent<T = any> = APIGatewayProxyEvent & { body: T };
export type ApiHandleContext = Context;
export type ApiHandler = (event?: ApiHandlerEvent, context?: ApiHandleContext) => any;
