import {
  APIGatewayEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { OutgoingHttpHeaders } from 'http';

import { ApiConfigCorsOptions, getConfig } from '../../config';
import { callAfterMiddleware, callBeforeMiddleware, callErrorHandlers } from '../middleware';
import {
  ApiAfterMiddleware,
  ApiBeforeMiddleware,
  ApiErrorHandler,
  ApiHandler,
  ApiHandlerEvent,
  MultiValueHeaders,
  Response,
  SingleValueHeaders,
} from './types';

const normalize = (event: APIGatewayProxyEvent): ApiHandlerEvent => {
  const clonedEvent = Object.assign(event);
  if (event.body) {
    try {
      clonedEvent.body = JSON.parse(clonedEvent.body);
    } catch (e) {
      console.error(e);
      const error = new Error('Bad Request');
      error.name = 'BadRequestError';
      throw error;
    }
  }

  return clonedEvent;
};

const httpMethodToStatus = (method: string, statusCode?: number): number => {
  return statusCode || (method === 'POST' ? 201 : 200);
};

const singleHeaders = (event: ApiHandlerEvent, headers: OutgoingHttpHeaders): SingleValueHeaders => {
  const finalHeaders = Object.keys(headers)
    .filter((k: string) => ['boolean', 'string', 'number'].indexOf(typeof headers[k]) > -1)
    .reduce((p: SingleValueHeaders, k: string) => Object.assign(p, {[k]: headers[k]}), {});

  const cors = getConfig().api.cors as ApiConfigCorsOptions;
  if (cors) {
    finalHeaders['Access-Control-Allow-Origin'] = cors.origin || event.headers.origin;
  }

  return finalHeaders;
};

const multipleHeaders = (event: ApiHandlerEvent, headers: OutgoingHttpHeaders): MultiValueHeaders => {
  const finalHeaders = Object.keys(headers)
    .filter((k: string) => ['boolean', 'string', 'number'].indexOf(typeof headers[k]) === -1)
    .reduce((p: MultiValueHeaders, k: string) => Object.assign(p, {[k]: headers[k]}), {});

  const cors = getConfig().api.cors as ApiConfigCorsOptions;
  if (cors) {
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    const exposedHeaders = Object.keys(headers).filter((v, i, a) => a.indexOf(v) === i);

    finalHeaders['Access-Control-Allow-Methods'] = cors.methods || allowedMethods;
    finalHeaders['Access-Control-Expose-Headers'] = cors.exposeHeaders || exposedHeaders;
    finalHeaders['Access-Control-Allow-Headers'] = cors.allowHeaders || Object.keys(event.headers);
  }

  return finalHeaders;
};

const format = (event: ApiHandlerEvent, response: Response, content: any): APIGatewayProxyResult => {
  const headers = singleHeaders(event, response.headers);
  const multiValueHeaders = multipleHeaders(event, response.headers);
  if (!content) {
    return {
      headers,
      multiValueHeaders,
      statusCode: event.httpMethod === 'POST' ? 201 : 204,
      body: '',
    };
  }

  return {
    headers,
    multiValueHeaders,
    statusCode: httpMethodToStatus(event.httpMethod, response.statusCode),
    body: JSON.stringify(content, (key, value) => {
      return getConfig().api.blacklist.indexOf(key) > -1 ? undefined : value;
    }),
  };
};

const formatError = (event: APIGatewayProxyEvent, response: Response, err: any): APIGatewayProxyResult => {
  switch (err.name) {
    case 'ValidationError':
      console.info(err);
      response.statusCode = 422;
      return format(event, response, {data: err.details});
    case 'BadRequestError':
      response.statusCode = 400;
      return format(event, response, err.details ? {data: err.details} : 'Bad Request');
    case 'ForbiddenError':
      response.statusCode = 403;
      return format(event, response, err.details ? {data: err.details} : 'Forbidden');
    default:
      console.error(err);
      response.statusCode = err.statusCode || 500;
      return format(event, response, err.body || 'Internal Server Error');
  }
};

export const apiHandler = (next: ApiHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const response = new Response();
    try {
      const normalizedEvent = await normalize(event);
      await callBeforeMiddleware<ApiBeforeMiddleware>('ApiGateway', [normalizedEvent, context]);

      const result = format(normalizedEvent, response, await next(normalizedEvent, response, context));
      await callAfterMiddleware<ApiAfterMiddleware>('ApiGateway', [normalizedEvent, result]);

      return result;
    } catch (err) {
      const result = formatError(event, response, err);
      await callErrorHandlers<ApiErrorHandler>('ApiGateway', [event, err, result]);

      return result;
    }
  };
};
