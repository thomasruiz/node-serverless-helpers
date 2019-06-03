import {
  APIGatewayEvent,
  APIGatewayProxyEvent,
  APIGatewayProxyHandler,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

import { getConfig } from '../../config';
import { ApiHandler, ApiHandlerEvent } from './types';

const normalize = (event: APIGatewayProxyEvent): ApiHandlerEvent => {
  const clonedEvent = Object.assign(event);
  if (event.body) {
    try {
      clonedEvent.body = JSON.parse(clonedEvent.body);
    } catch (e) {
      throw {
        statusCode: 400,
        body: 'Bad Request',
      };
    }
  }

  return clonedEvent;
};

const httpMethodToStatus = (method: string): number => {
  return method === 'POST' ? 201 : 200;
};

const format = async (event: ApiHandlerEvent, content: any): Promise<APIGatewayProxyResult> => {
  if (!content) {
    return {statusCode: 204, body: ''};
  }

  if (content.statusCode && Object.keys(content).indexOf('body') !== -1) {
    return content;
  }

  return {
    statusCode: httpMethodToStatus(event.httpMethod),
    body: JSON.stringify(content, (key, value) => {
      return getConfig().api.blacklist.indexOf(key) > -1 ? undefined : value;
    }),
  };
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
    body: JSON.stringify(err.body ? err.body : 'Internal Server Error'),
  };
};

export const apiHandler = (next: ApiHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => {
    try {
      const normalizedEvent = await normalize(event);
      return format(normalizedEvent, await next(normalizedEvent, context));
    } catch (err) {
      return formatError(err);
    }
  };
};
