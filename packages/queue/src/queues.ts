import { Queue } from "bullmq";

import { redisConnection } from "./connection";
import type { ScrapeJobData, EmailJobData } from "./types";

export const scrapingQueue = new Queue<ScrapeJobData>("scraping-pipeline", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export const emailQueue = new Queue<EmailJobData>("email-notifications", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: 50,
    removeOnFail: 100,
  },
});
