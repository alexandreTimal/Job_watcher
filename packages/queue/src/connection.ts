import { type ConnectionOptions } from "bullmq";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("Missing REDIS_URL environment variable");
}

let url: URL;
try {
  url = new URL(redisUrl);
} catch {
  throw new Error(`Invalid REDIS_URL: must be a valid URL (got "${redisUrl}")`);
}

export const redisConnection: ConnectionOptions = {
  host: url.hostname,
  port: url.port ? Number(url.port) : 6379,
  password: url.password ? url.password : undefined,
};
