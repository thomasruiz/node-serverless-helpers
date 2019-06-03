import {
  APIGatewayEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { OutgoingHttpHeaders } from 'http';

import { ApiConfigCorsOptions, getConfig } from '../../config';
import { ApiHandler, ApiHandlerEvent } from './types';

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

const singleHeaders = (event: ApiHandlerEvent, headers: OutgoingHttpHeaders): { [header: string]: boolean | number | string } => {
  const finalHeaders = Object.keys(headers)
    .filter((k: string) => ['boolean', 'string', 'number'].indexOf(typeof headers[k]) > -1)
    .reduce((p: { [header: string]: boolean | number | string }, k: string) => {
      return Object.assign(p, {[k]: headers[k]});
    }, {});

  const cors = (getConfig().api.cors === true ? {} : getConfig().api.cors) as ApiConfigCorsOptions;
  if (cors) {
    finalHeaders['Access-Control-Allow-Origin'] = cors.origin || event.headers.host;
  }

  return finalHeaders;
};

const multipleHeaders = (
  event: ApiHandlerEvent,
  existingHeaders: { [header: string]: boolean | number | string },
  headers: OutgoingHttpHeaders,
): { [header: string]: Array<boolean | number | string> } => {
  const finalHeaders = Object.keys(headers)
    .filter((k: string) => ['boolean', 'string', 'number'].indexOf(typeof headers[k]) === -1)
    .reduce((p: { [header: string]: boolean | number | string }, k: string) => {
      return Object.assign(p, {[k]: headers[k]});
    }, {});

  const cors = (getConfig().api.cors === true ? {} : getConfig().api.cors) as ApiConfigCorsOptions;
  if (cors) {
    const exposedHeaders = Object.keys(headers)
      .concat(Object.keys(existingHeaders))
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(', ');

    finalHeaders['Access-Control-Allow-Origin'] = cors.origin || event.headers.host;
    finalHeaders['Access-Control-Expose-Headers'] = cors.exposeHeaders || exposedHeaders;
    finalHeaders['Access-Control-Allow-Headers'] = cors.allowHeaders || Object.keys(event.headers).join(', ');
  }

  return finalHeaders;
};

const format = async (event: ApiHandlerEvent, response: Response, content: any): Promise<APIGatewayProxyResult> => {
  const headers = singleHeaders(event, response.headers);
  const multiValueHeaders = multipleHeaders(event, headers, response.headers);
  if (!content) {
    return {
      headers,
      multiValueHeaders,
      statusCode: 204,
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

const formatError = async (
  event: APIGatewayProxyEvent,
  response: Response,
  err: any,
): Promise<APIGatewayProxyResult> => {
  switch (err.name) {
    case 'ValidationError':
      console.info(err);
      response.statusCode = 422;
      return format(event, response, {data: err.details});
    case 'BadRequestError':
      response.statusCode = 400;
      return format(event, response, 'Bad Request');
    default:
      console.error(err);
      response.statusCode = 500;
      return format(event, response, err.body || 'Internal Server Error');
  }
};

export const apiHandler = (next: ApiHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    const response = new Response();
    try {
      const normalizedEvent = await normalize(event);
      return format(normalizedEvent, response, await next(normalizedEvent, response, context));
    } catch (err) {
      return formatError(event, response, err);
    }
  };
};

export class Response {
  statusCode?: number = undefined;
  headers: OutgoingHttpHeaders = {};
}
