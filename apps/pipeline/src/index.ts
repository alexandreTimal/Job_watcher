import { Worker, Queue } from "bullmq";

import { redisConnection } from "@jobfindeer/queue";
import type { ScrapeJobData } from "@jobfindeer/queue";

import { runPipeline, runSingleSource } from "./orchestrator";
import { createLogger } from "./lib/logger";

const logger = createLogger("PIPELINE");

// Worker for individual source scraping
const scrapingWorker = new Worker<ScrapeJobData>(
  "scraping-pipeline",
  async (job) => {
    if (job.data.sourceName === "__full_pipeline__") {
      await runPipeline();
    } else {
      await runSingleSource(job.data.sourceName, job.data.userId);
    }
  },
  { connection: redisConnection, concurrency: 1 },
);

scrapingWorker.on("completed", (job) => {
  logger.info(`Job completed: ${job.name}`, { id: job.id });
});

scrapingWorker.on("failed", (job, err) => {
  logger.error(`Job failed: ${job?.name}`, { id: job?.id, error: err instanceof Error ? err.message : String(err) });
});

// Schedule nightly pipeline at 2:00 AM
const schedulerQueue = new Queue("scraping-pipeline", { connection: redisConnection });

async function setupScheduler() {
  // Remove existing repeatable jobs to avoid duplicates
  const existing = await schedulerQueue.getRepeatableJobs();
  for (const job of existing) {
    await schedulerQueue.removeRepeatableByKey(job.key);
  }

  await schedulerQueue.add(
    "nightly-pipeline",
    { sourceName: "__full_pipeline__", runId: "" },
    {
      repeat: { pattern: "0 2 * * *" }, // Every day at 2:00 AM
    },
  );

  logger.info("Nightly scheduler configured (2:00 AM)");
}

setupScheduler().catch((err) => {
  logger.error("Failed to setup scheduler", { error: err instanceof Error ? err.message : String(err) });
});

logger.info("Pipeline worker started");
