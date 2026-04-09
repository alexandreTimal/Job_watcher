import { Worker } from "bullmq";

import { redisConnection } from "@jobfindeer/queue";
import type { ScrapeJobData } from "@jobfindeer/queue";

import { createLogger } from "./lib/logger";

const logger = createLogger("PIPELINE");

const worker = new Worker<ScrapeJobData>(
  "scraping-pipeline",
  async (job) => {
    logger.info(`Processing job ${job.name}`, { source: job.data.sourceName, runId: job.data.runId });
    // Source workers will be registered in Tasks 11-13
  },
  { connection: redisConnection, concurrency: 3 },
);

worker.on("completed", (job) => {
  logger.info(`Job completed: ${job.name}`, { id: job.id });
});

worker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job?.name}`, { id: job?.id, error: err instanceof Error ? err.message : String(err) });
});

logger.info("Pipeline worker started");
