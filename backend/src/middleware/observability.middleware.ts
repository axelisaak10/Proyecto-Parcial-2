import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import type { NextFunction, Request, Response } from 'express';
import {
  emitStructuredLog,
  errorsCounter,
  requestDurationMs,
  requestsCounter,
} from '../observability/telemetry';
import { apiError } from '../types/api-response';

export function observabilityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startNs = process.hrtime.bigint();
  const method = req.method;
  const rawPath = req.originalUrl.split('?')[0] || '/';
  const isApi = rawPath.toLowerCase().startsWith('/api');

  if (isApi) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  res.on('finish', () => {
    if (!isApi) return;

    const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1_000_000;
    const durationMs = Math.round(elapsedMs * 100) / 100;
    const statusCode = res.statusCode;

    const routePath =
      req.route && typeof req.route.path === 'string'
        ? `${req.baseUrl || ''}${req.route.path === '/' ? '' : req.route.path}` || '/'
        : rawPath;

    const attrs = {
      endpoint: routePath,
      method,
      statusCode: String(statusCode),
    };

    requestsCounter.add(1, attrs);
    requestDurationMs.record(durationMs, attrs);
    if (statusCode >= 400) {
      errorsCounter.add(1, attrs);
    }

    const activeSpan = trace.getSpan(context.active());
    const spanCtx = activeSpan?.spanContext();
    const traceId = spanCtx?.traceId || '';
    const spanId = spanCtx?.spanId || '';
    const userId = req.user ? String(req.user.id) : 'anonymous';
    const timestamp = new Date().toISOString();

    const logAttrs = {
      method,
      endpoint: routePath,
      statuscode: statusCode,
      durationMs,
      userId,
      traceId,
      spanId,
      timestamp,
    };

    const msg = `HTTP ${method} ${routePath} responded ${statusCode} in ${durationMs}ms`;
    if (statusCode >= 500) {
      emitStructuredLog('Error', msg, logAttrs);
    } else if (statusCode >= 400) {
      emitStructuredLog('Warning', msg, logAttrs);
    } else {
      emitStructuredLog('Information', msg, logAttrs);
    }
  });

  next();
}

export function createErrorMiddleware(isProduction: boolean) {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const error = err instanceof Error ? err : new Error(String(err));
    const activeSpan = trace.getSpan(context.active());
    activeSpan?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    activeSpan?.recordException(error);

    const spanCtx = activeSpan?.spanContext();
    emitStructuredLog('Error', `Unhandled exception on ${req.method} ${req.path}: ${error.message}`, {
      method: req.method,
      endpoint: req.path,
      statuscode: 500,
      traceId: spanCtx?.traceId || '',
      spanId: spanCtx?.spanId || '',
      timestamp: new Date().toISOString(),
    });

    if (res.headersSent) return;

    const message = isProduction
      ? 'An internal server error occurred'
      : `Internal server error: ${error.message}`;

    res.status(500).json(apiError(message, 500));
  };
}
