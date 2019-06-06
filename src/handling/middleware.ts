import { ApiAfterMiddleware, ApiBeforeMiddleware, ApiErrorHandler } from './api';

export type DefaultBeforeMiddleware = (event: any, context: any) => Promise<void>;
export type BeforeMiddleware = ApiBeforeMiddleware | DefaultAfterMiddleware;

export type DefaultAfterMiddleware = (event: any, result: any) => Promise<void>;
export type AfterMiddleware = ApiAfterMiddleware | DefaultAfterMiddleware;

export type DefaultErrorHandler = (event: any, error: any, result: any) => Promise<void>;
export type ErrorHandler = ApiErrorHandler | DefaultErrorHandler;

export type HandlingType = 'ApiGateway';

export type MiddlewareListItem<Before, After, ErrHandler> = { before: Before[], after: After[], errors: ErrHandler[] };
export type MiddlewareList = {
  '__ALWAYS__': MiddlewareListItem<DefaultBeforeMiddleware, DefaultAfterMiddleware, DefaultErrorHandler>,
  'ApiGateway': MiddlewareListItem<ApiBeforeMiddleware, ApiAfterMiddleware, ApiErrorHandler>,
};

const middlewareList: MiddlewareList = {
  '__ALWAYS__': {before: [], after: [], errors: []},
  'ApiGateway': {before: [], after: [], errors: []},
};

const isSendingType = (
  typeOrMiddleware: HandlingType | BeforeMiddleware[] | AfterMiddleware[] | ErrorHandler[],
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

export const callErrorHandlers = async <T extends (...args: any[]) => any>(
  type: HandlingType,
  args: Parameters<T>,
): Promise<void> => {
  for (const middleware of middlewareList.ApiGateway.errors) {
    await middleware.apply({}, args);
  }

  for (const middleware of middlewareList.__ALWAYS__.errors) {
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

export function handleError(type: 'ApiGateway', middleware: ApiErrorHandler[]): void;
export function handleError(middleware: DefaultErrorHandler[]): void;
export function handleError(typeOrMiddleware: HandlingType | ErrorHandler[], middleware: ErrorHandler[] = []): void {
  if (!isSendingType(typeOrMiddleware)) {
    middlewareList['__ALWAYS__'].errors = typeOrMiddleware;
  } else {
    middlewareList[typeOrMiddleware].errors = middleware;
  }
}
