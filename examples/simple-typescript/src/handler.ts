import { handle } from 'node-serverless-helpers';
import { ApiHandlerEvent } from '../../../src/handling/api';

export const helloWorld = handle(async (event: ApiHandlerEvent): Promise<string> => {
  return `hello lambda world. Called from ${event.path}`;
});
