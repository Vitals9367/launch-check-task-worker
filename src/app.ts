import { Worker } from "bullmq";
import { scan } from "./tasks/scan";
import { env } from "./env.mjs";

const redisConnection = {
  url: env.REDIS_URL,
};

const scanWorker = new Worker(env.SCAN_QUEUE_NAME, scan, {
  connection: redisConnection,
  autorun: false,
});

scanWorker.run();
