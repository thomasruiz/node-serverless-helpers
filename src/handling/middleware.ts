import { ApiAfterMiddleware, ApiBeforeMiddleware } from './api';

export type DefaultBeforeMiddleware = (event: any, context: any) => Promise<void>;
export type BeforeMiddleware = ApiBeforeMiddleware | DefaultAfterMiddleware;

export type DefaultAfterMiddleware = (event: any, context: any) => Promise<void>;
export type AfterMiddleware = ApiAfterMiddleware | DefaultAfterMiddleware;

export type HandlingType = 'ApiGateway';

export type MiddlewareListItem<Before, After> = { before: Before[], after: After[] };
export type MiddlewareList = {
  '__ALWAYS__': MiddlewareListItem<DefaultBeforeMiddleware, DefaultAfterMiddleware>,
  'ApiGateway': MiddlewareListItem<ApiBeforeMiddleware, ApiAfterMiddleware>,
};

const middlewareList: MiddlewareList = {
  '__ALWAYS__': {before: [], after: []},
  'ApiGateway': {before: [], after: []},
};

const isSendingType = (
  typeOrMiddleware: HandlingType | BeforeMiddleware[],
): typeOrMiddleware is HandlingType => typeof typeOrMiddleware === 'string';

export const callBeforeMiddleware = async <T extends (...args: any[]) => any>(
  type: HandlingType,
  args: Parameters<T>,
): Promise<void> => {
  for (const middleware of middlewareList.__ALWAYS__.before) {
    await middleware.apply({}, args);
  }

  for (const middleware of middlewareList.ApiGateway.before) {
    await middleware.apply({}, args);
  }
};

export const callAfterMiddleware = async <T extends (...args: any[]) => any>(
  type: HandlingType,
  args: Parameters<T>,
): Promise<void> => {
  for (const middleware of middlewareList.ApiGateway.after) {
    await middleware.apply({}, args);
  }

  for (const middleware of middlewareList.__ALWAYS__.after) {
    await middleware.apply({}, args);
  }
};

export function before(type: 'ApiGateway', middleware: ApiBeforeMiddleware[]): void;
export function before(middleware: DefaultBeforeMiddleware[]): void;
export function before(typeOrMiddleware: HandlingType | BeforeMiddleware[], middleware: BeforeMiddleware[] = []): void {
  if (!isSendingType(typeOrMiddleware)) {
    middlewareList['__ALWAYS__'].before = typeOrMiddleware;
  } else {
    middlewareList[typeOrMiddleware].before = middleware;
  }
}

export function after(type: 'ApiGateway', middleware: ApiAfterMiddleware[]): void;
export function after(middleware: DefaultAfterMiddleware[]): void;
export function after(typeOrMiddleware: HandlingType | AfterMiddleware[], middleware: AfterMiddleware[] = []): void {
  if (!isSendingType(typeOrMiddleware)) {
    middlewareList['__ALWAYS__'].after = typeOrMiddleware;
  } else {
    middlewareList[typeOrMiddleware].after = middleware;
  }
}
