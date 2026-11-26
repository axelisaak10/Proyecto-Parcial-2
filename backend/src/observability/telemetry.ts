import { logs, metrics, SeverityNumber, trace } from '@opentelemetry/api';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import type { AppConfig } from '../config/env';

export const SERVICE_NAME = 'ToyStore.API';
export const SERVICE_VERSION = '2.0.0';

let sdk: NodeSDK | null = null;

function parseOtlpHeaders(raw: string): Record<string, string> | undefined {
  if (!raw.trim()) return undefined;
  const headers: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      if (k) headers[k] = v;
    }
  }
  return Object.keys(headers).length > 0 ? headers : undefined;
}

function buildSignalUrl(baseEndpoint: string, signalPath: string): string {
  const normalized = baseEndpoint.endsWith('/') ? baseEndpoint : `${baseEndpoint}/`;
  return new URL(signalPath, normalized).toString();
}

export function initTelemetry(config: AppConfig): void {
  if (sdk || config.isTest || !config.otlpEndpoint) {
    return;
  }

  const headers = parseOtlpHeaders(config.otlpHeaders);
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': config.nodeEnv,
  });

  const traceExporter = new OTLPTraceExporter({
    url: buildSignalUrl(config.otlpEndpoint, 'v1/traces'),
    headers,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: buildSignalUrl(config.otlpEndpoint, 'v1/metrics'),
      headers,
    }),
    exportIntervalMillis: 15_000,
  });

  const logRecordProcessor = new BatchLogRecordProcessor({
    exporter: new OTLPLogExporter({
      url: buildSignalUrl(config.otlpEndpoint, 'v1/logs'),
      headers,
    }),
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReaders: [metricReader],
    logRecordProcessors: [logRecordProcessor],
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  sdk.start();
}

export async function shutdownTelemetry(): Promise<void> {
  if (!sdk) return;
  const activeSdk = sdk;
  sdk = null;
  await activeSdk.shutdown();
}

export const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);
const meter = metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);

export const requestsCounter = meter.createCounter('toystore_http_requests_total', {
  unit: '{request}',
  description: 'Total HTTP requests processed by endpoint, method, and statusCode',
});

export const errorsCounter = meter.createCounter('toystore_http_errors_total', {
  unit: '{error}',
  description: 'Total HTTP error responses (4xx and 5xx) by endpoint, method, and statusCode',
});

export const requestDurationMs = meter.createHistogram('toystore_http_request_duration_ms', {
  unit: 'ms',
  description: 'HTTP request latency in milliseconds by endpoint, method, and statusCode',
});

export type LogSeverity = 'Information' | 'Warning' | 'Error';

const SEVERITY_MAP: Record<LogSeverity, SeverityNumber> = {
  Information: SeverityNumber.INFO,
  Warning: SeverityNumber.WARN,
  Error: SeverityNumber.ERROR,
};

export function emitStructuredLog(
  severity: LogSeverity,
  message: string,
  attributes: Record<string, string | number | boolean>
): void {
  const logger = logs.getLogger(SERVICE_NAME, SERVICE_VERSION);
  logger.emit({
    severityNumber: SEVERITY_MAP[severity],
    severityText: severity,
    body: message,
    attributes: {
      severity,
      ...attributes,
    },
  });

  if (process.env.NODE_ENV !== 'test') {
    const line = JSON.stringify({ severity, message, ...attributes });
    if (severity === 'Error') {
      console.error(line);
    } else if (severity === 'Warning') {
      console.warn(line);
    } else {
      console.info(line);
    }
  }
}
