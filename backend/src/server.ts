import { createApp } from './app';
import { loadConfig } from './config/env';
import { initTelemetry, shutdownTelemetry } from './observability/telemetry';

const bootConfig = loadConfig();
initTelemetry(bootConfig);

const instance = createApp();
const server = instance.app.listen(instance.config.port, () => {
  console.log(
    `[toystore-api] Listening on port ${instance.config.port} (env=${instance.config.nodeEnv})`
  );
});

let shuttingDown = false;
async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[toystore-api] Received ${signal}, shutting down gracefully...`);

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  instance.close();
  await shutdownTelemetry();
  process.exit(0);
}

process.on('SIGINT', () => {
  void gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void gracefulShutdown('SIGTERM');
});
