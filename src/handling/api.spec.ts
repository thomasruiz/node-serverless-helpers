import {APIGatewayProxyEvent} from 'aws-lambda';
import {getConfig} from '../config';
import api from './api';

jest.mock('../config');
const mock = getConfig as jest.Mock<Function>;

describe('handling', () => {
    const defaultContext: any = {};
    const defaultCallback: any = () => null;

    beforeEach(() => {
        jest.resetAllMocks();
        mock.mockReturnValue({api: {blacklist: []}});
    });

    describe('api', () => {
        it('parses request body correctly', async () => {
            expect.assertions(1);
            const body = {email: 'foo@example.com'};
            api(async (event: APIGatewayProxyEvent): Promise<any> => {
                expect(event.body).toStrictEqual(body);
            })({body: JSON.stringify(body)} as any, defaultContext, defaultCallback);
        });

        it('throws a 400 Bad Request when request body is incorrect', async () => {
            const response = await api(
                async (): Promise<any> => null,
            )({body: 'not json'} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 400,
                body: JSON.stringify('Bad Request'),
            });
        });

        it('returns a correct ApiGatewayProxyResponse', async () => {
            const body = {email: 'foo@example.com'};

            const response = await api(async (): Promise<any> => {
                return body;
            })({} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 200,
                body: JSON.stringify(body),
            });
        });

        it('returns a 201 when POST succeeds', async () => {
            const response = await api(
                async (): Promise<any> => ({}),
            )({httpMethod: 'POST'} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 201,
                body: JSON.stringify({}),
            });
        });

        it('returns a 204 when response body is empty', async () => {
            const response = await api(
                async (): Promise<any> => null,
            )({} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 204,
                body: '',
            });
        });

        it('strips response body of configured blacklist', async () => {
            mock.mockReturnValue({api: {blacklist: ['password']}});

            const response = await api(
                async (): Promise<any> => ({password: 'password'}),
            )({} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 200,
                body: JSON.stringify({}),
            });
        });

        it('formats validation errors', async () => {
            const errorDetails = [{}];

            const response = await api(
                async (): Promise<any> => {
                    throw {
                        name: 'ValidationError',
                        details: errorDetails,
                    };
                },
            )({} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 422,
                body: JSON.stringify({data: errorDetails}),
            });
        });

        it('throws a 500 when an error happens', async () => {
            const response = await api(
                async (): Promise<any> => {
                    throw 'error';
                },
            )({} as any, defaultContext, defaultCallback);

            expect(response).toStrictEqual({
                statusCode: 500,
                body: JSON.stringify('Internal Server Error'),
            });
        });
    });
});
