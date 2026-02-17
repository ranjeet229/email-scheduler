function required(key: string): string {
  const v = process.env[key];
  if (v == null || v === '') throw new Error(`Missing env: ${key}`);
  return v;
}

function optional(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function optionalInt(key: string, defaultValue: number): number {
  const v = process.env[key];
  if (v == null || v === '') return defaultValue;
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return defaultValue;
  return n;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: optionalInt('PORT', 4000),
  mongodbUri: required('MONGODB_URI'),
  redisUrl: required('REDIS_URL'),
  sessionSecret: required('SESSION_SECRET'),
  apiUrl: optional('API_URL', 'http://localhost:4000'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:3000'),
  workerConcurrency: optionalInt('WORKER_CONCURRENCY', 5),
  minDelayMs: optionalInt('MIN_DELAY_MS', 2000),
  maxEmailsPerHour: optionalInt('MAX_EMAILS_PER_HOUR', 100),
  etherealUser: optional('ETHEREAL_USER', ''),
  etherealPass: optional('ETHEREAL_PASS', ''),
} as const;
