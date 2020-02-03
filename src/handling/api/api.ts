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
import {log} from '../../debug';


const normalize = (event: APIGatewayProxyEvent): ApiHandlerEvent => {
  log.debug('[API] Normalizing event');
  const clonedEvent = Object.assign(event);
  if (event.body) {
    try {
      log.debug('[API] Parsing request body from JSON');
      clonedEvent.body = JSON.parse(clonedEvent.body);
    } catch (e) {
      log.debug('[API] ERROR: Only JSON Accepted');
      const error = new Error('Only JSON payloads are accepted');
      error.name = 'BadRequestError';
      throw error;
    }
  }

  return clonedEvent;
};

const httpMethodToStatus = (method: string, statusCode?: number): number => {
  log.debug('[API] Setting status code for method', method, statusCode || (method === 'POST' ? 201 : 200));
  return statusCode || (method === 'POST' ? 201 : 200);
};

const singleHeaders = (event: ApiHandlerEvent, headers: OutgoingHttpHeaders): SingleValueHeaders => {
  const finalHeaders = Object.keys(headers)
    .filter((k: string) => ['boolean', 'string', 'number'].indexOf(typeof headers[k]) > -1)
    .reduce((p: SingleValueHeaders, k: string) => Object.assign(p, {[k]: headers[k]}), {});
  const cors = getConfig().api.cors as ApiConfigCorsOptions;
  log.debug('[API] Reading CORS config', cors);
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
  log.debug('[API] Formatting response');
  log.debug('[API] Setting headers');
  const headers = singleHeaders(event, response.headers);
  const multiValueHeaders = multipleHeaders(event, response.headers);
  if (content === null || content === undefined || content === '') {
    log.debug('[API] No content returning 204');
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
  log.debug('[API] Error name', err.name);
  switch (err.name) {
    case 'ValidationError':
      log.debug('[API] 422 - Validation error');
      response.statusCode = 422;
      return format(event, response, {data: err.details});
    case 'BadRequestError':
      log.debug('[API] 400 - Bad request');
      response.statusCode = 400;
      return format(event, response, err.details ? {data: err.details} : 'Bad Request');
    case 'ForbiddenError':
      response.statusCode = 403;
      return format(event, response, err.details ? {data: err.details} : 'Forbidden');
    default:
      log.debug('[API] 500 - Generic error');
      response.statusCode = err.statusCode || 500;
      return format(event, response, err.body || 'Internal Server Error');
  }
};

export const apiHandler = (next: ApiHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    log.debug('[API] Initializing response');
    const response = new Response();
    try {
      log.debug('[API] Normalizing event', event);
      const normalizedEvent = await normalize(event);
      log.debug('[API] Normalized event', normalizedEvent);
      log.debug('[API] Calling before middleware');
      await callBeforeMiddleware<ApiBeforeMiddleware>('ApiGateway', [normalizedEvent, context]);
      log.debug('[API] Run business logic code');
      const result = format(normalizedEvent, response, await next(normalizedEvent, response, context));
      log.debug('[API] Formatted result', result);
      log.debug('[API] Calling after middleware');
      await callAfterMiddleware<ApiAfterMiddleware>('ApiGateway', [normalizedEvent, result]);
      return result;
    } catch (err) {
      log.debug('[API] Error happened !', err);
      const result = formatError(event, response, err);
      log.debug('[API] Formatted', result);
      log.debug('[API] Calling error middleware');
      await callErrorHandlers<ApiErrorHandler>('ApiGateway', [event, err, result]);
      return result;
    }
  };
};
