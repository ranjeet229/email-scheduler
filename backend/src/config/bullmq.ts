import { env } from './env.js';

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const u = new URL(url);
  const port = u.port ? parseInt(u.port, 10) : 6379;
  const password = u.password || undefined;
  return {
    host: u.hostname,
    port: Number.isNaN(port) ? 6379 : port,
    ...(password && { password }),
  };
}

export const bullmqConnection = parseRedisUrl(env.redisUrl);
