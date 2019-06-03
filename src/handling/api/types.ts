import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { Response } from './api';

export type ApiHandlerEvent<T = any> = APIGatewayProxyEvent & { body: T };
export type ApiHandleContext = Context;
export type ApiHandler = (event: ApiHandlerEvent, response: Response, context?: ApiHandleContext) => any;
