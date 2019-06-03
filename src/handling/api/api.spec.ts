import { APIGatewayProxyEvent } from 'aws-lambda';

import { getConfig } from '../../config';
import { apiHandler } from './api';

jest.mock('../../config');
const mock = getConfig as jest.Mock;

describe('handling', () => {
  const defaultContext: any = {};
  const defaultCallback: any = () => null;

  beforeEach(() => {
    jest.resetAllMocks();
    mock.mockReturnValue({api: {cors: false, blacklist: []}});
  });

  describe('api', () => {
    it('parses request body correctly', async () => {
      expect.assertions(1);
      const body = {email: 'foo@example.com'};
      apiHandler(async (event: APIGatewayProxyEvent): Promise<any> => {
        expect(event.body).toStrictEqual(body);
      })({body: JSON.stringify(body)} as any, defaultContext, defaultCallback);
    });

    it('throws a 400 Bad Request when request body is incorrect', async () => {
      const response = await apiHandler(
        async (): Promise<any> => null,
      )({body: 'not json'} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 400,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify('Bad Request'),
      });
    });

    it('returns a correct ApiGatewayProxyResponse', async () => {
      const body = {email: 'foo@example.com'};

      const response = await apiHandler(async (): Promise<any> => {
        return body;
      })({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 200,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify(body),
      });
    });

    it('returns a 201 when POST succeeds', async () => {
      const response = await apiHandler(
        async (): Promise<any> => ({}),
      )({httpMethod: 'POST'} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 201,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify({}),
      });
    });

    it('returns a 204 when response body is empty', async () => {
      const response = await apiHandler(
        async (): Promise<any> => null,
      )({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 204,
        headers: {},
        multiValueHeaders: {},
        body: '',
      });
    });

    it('strips response body of configured blacklist', async () => {
      mock.mockReturnValue({api: {blacklist: ['password']}});

      const response = await apiHandler(
        async (): Promise<any> => ({password: 'password'}),
      )({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 200,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify({}),
      });
    });

    it('formats validation errors', async () => {
      const errorDetails = [{}];

      const response = await apiHandler(
        async (): Promise<any> => {
          throw {
            name: 'ValidationError',
            details: errorDetails,
          };
        },
      )({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 422,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify({data: errorDetails}),
      });
    });

    it('throws a 500 when an error happens', async () => {
      const response = await apiHandler(
        async (): Promise<any> => {
          throw 'error';
        },
      )({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 500,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify('Internal Server Error'),
      });
    });

    it('does not return the content directly anymore, even with statusCode', async () => {
      const response = await apiHandler(
        async (): Promise<any> => {
          return {statusCode: 200, body: JSON.stringify('foo')};
        },
      )({} as any, defaultContext, defaultCallback);

      expect(response).toStrictEqual({
        statusCode: 200,
        headers: {},
        multiValueHeaders: {},
        body: JSON.stringify({
          statusCode: 200,
          body: '"foo"',
        }),
      });
    });
  });
});
