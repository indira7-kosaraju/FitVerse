import mongoose from 'mongoose';
import app from './app.js';
import { config } from './config.js';

mongoose.set('strictQuery', true);

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  process.exit(1);
});

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 15000 });
console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

const server = app.listen(config.port, () => {
  console.log(`FitVerse ${config.isProd ? 'production' : 'development'} server on port ${config.port}`);
});
// Slightly above typical load-balancer idle timeouts to avoid 502s on reused connections.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, closing server...`);
  const force = setTimeout(() => process.exit(1), 10_000);
  force.unref();
  server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
