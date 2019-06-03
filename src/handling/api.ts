import {
    APIGatewayEvent,
    APIGatewayProxyCallback,
    APIGatewayProxyHandler,
    APIGatewayProxyResult,
    Context,
} from 'aws-lambda';

import { getConfig } from '../config';

export type ApiHandler = (event?: APIGatewayEvent, context?: Context, callback?: APIGatewayProxyCallback) => Promise<any>;

const normalize = async (event: APIGatewayEvent) => {
  if (event.body) {
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

const httpMethodToStatus = (method: string): number => {
  switch (method) {
    case 'POST':
      return 201;
  }

  return 200;
};

const format = async (event: APIGatewayEvent, content: any): Promise<APIGatewayProxyResult> => {
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

export default (next: ApiHandler): APIGatewayProxyHandler => {
  return async (event: APIGatewayEvent, context: Context, callback: APIGatewayProxyCallback): Promise<APIGatewayProxyResult> => {
    try {
      await normalize(event);
      return format(event, await next(event, context, callback));
    } catch (err) {
      return formatError(err);
    }
  };
};
