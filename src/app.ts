import { Worker } from "bullmq";
import { scan } from "./tasks/scan";
import { env } from "./env.mjs";
import { logger } from "./logger";

const redisConnection = {
  url: env.REDIS_URL,
};

const scanWorker = new Worker(env.SCAN_QUEUE_NAME, scan, {
  connection: redisConnection,
  autorun: false,
  concurrency: 10,
  skipStalledCheck: true,
});

scanWorker.on("active", (job) => {
  logger.info("Job started processing", {
    jobId: job.id,
    data: job.data,
    queue: env.SCAN_QUEUE_NAME,
  });
});

scanWorker.on("completed", (job) => {
  logger.info("Job completed successfully", {
    jobId: job.id,
    queue: env.SCAN_QUEUE_NAME,
  });
});

scanWorker.on("failed", (job, error) => {
  logger.error("Job failed", {
    jobId: job?.id,
    error: error.message,
    stack: error.stack,
    queue: env.SCAN_QUEUE_NAME,
  });
});

scanWorker.on("error", (error) => {
  logger.error("Worker error", {
    error: error.message,
    stack: error.stack,
    queue: env.SCAN_QUEUE_NAME,
  });
});

logger.info("Starting scan worker", {
  queue: env.SCAN_QUEUE_NAME,
  redis: env.REDIS_URL,
});

scanWorker.run();
