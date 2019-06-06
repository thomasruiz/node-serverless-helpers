import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { OutgoingHttpHeaders } from 'http';

export class Response {
  statusCode?: number = undefined;
  headers: OutgoingHttpHeaders = {};
}

export interface MultiValueHeaders {
  [header: string]: Array<boolean | number | string>;
}

export interface SingleValueHeaders {
  [header: string]: boolean | number | string;
}

export type ApiHandlerEvent<T = any> = APIGatewayProxyEvent & { body: T };
export type ApiHandleContext = Context;
export type ApiHandler = (event: ApiHandlerEvent, response: Response, context: ApiHandleContext) => Promise<any>;
export type ApiBeforeMiddleware = (event: ApiHandlerEvent, context: ApiHandleContext) => Promise<void>;
export type ApiAfterMiddleware = (event: ApiHandlerEvent, result: APIGatewayProxyResult) => Promise<void>;
