import { Worker } from "bullmq";
import { scan } from "./tasks/scan";
import { env } from "./env.mjs";
import { logger } from "./logger";

const redisConnection = {
  url: env.REDIS_URL,
};

// Configure worker for long-running security scans
const scanWorker = new Worker(env.SCAN_QUEUE_NAME, scan, {
  connection: redisConnection,
  autorun: false,
  // Reduce concurrency to prevent resource exhaustion
  concurrency: 10,
  // Increase timeout for long-running scans (30 minutes)
  lockDuration: 1800000,
  // Automatically extend lock while job is active
  lockRenewTime: 15000,
  // Don't process stalled jobs immediately
  stalledInterval: 30000,
  // Maximum number of stalled job checks
  maxStalledCount: 3,
  // Remove completed jobs after 1 hour
  removeOnComplete: {
    age: 3600,
    count: 1000,
  },
  // Keep failed jobs for 24 hours
  removeOnFail: {
    age: 86400,
    count: 1000,
  },
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

// Start the worker
scanWorker.run();

logger.info("Starting scan worker", {
  queue: env.SCAN_QUEUE_NAME,
  redis: env.REDIS_URL,
  settings: {
    concurrency: 2,
    lockDuration: "30 minutes",
    lockRenewTime: "15 seconds",
  },
});
