import { Job, Queue } from "bullmq";
import { SCAN_STATUS } from "@/services/nuclei/types";
import { logger } from "@/logger";
import { env } from "@/env.mjs";
import type { ScanJob, SendScanEmailData } from "./types";
import {
  updateScanStatus,
  getScanRecord,
  storeScanResults,
} from "./db-operations";
import {
  createScanContext,
  scanTargetUrl,
  getZapAlerts,
  removeContext,
} from "./scan-operations";
import { mapAlertsToFindings, calculateStats } from "./findings-utils";

// Initialize notification queue
const notificationQueue = new Queue<SendScanEmailData>("scan-notifications", {
  connection: {
    url: env.REDIS_URL,
  },
});

/**
 * Main scan task handler
 */
export const scan = async (job: Job<ScanJob>): Promise<void> => {
  const { scanId, request } = job.data;

  if (!scanId || !request?.targetUrls?.length) {
    throw new Error("Invalid job data: scanId and targetUrls are required");
  }

  let contextName: string | undefined;

  try {
    logger.info("Starting scan task", { scanId, targets: request.targetUrls });

    // Fetch scan record to get projectId
    const scanRecord = await getScanRecord(scanId);

    // Set scan to in progress
    await updateScanStatus(scanId, SCAN_STATUS.InProgress);

    // Create context
    contextName = await createScanContext(scanId, request.targetUrls);
    logger.info("Created ZAP context", { scanId, contextName });

    // Scan each target URL
    for (const targetUrl of request.targetUrls) {
      try {
        await scanTargetUrl(targetUrl, scanId, contextName);
      } catch (error) {
        logger.error("Error during scan operations", {
          scanId,
          targetUrl,
          contextName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        await updateScanStatus(scanId, SCAN_STATUS.Failed, undefined, error);
        throw error;
      }
    }

    // Get and process alerts
    const alerts = await getZapAlerts(contextName);

    if (alerts.length > 0) {
      try {
        const findings = mapAlertsToFindings(alerts, scanId, contextName);
        const stats = calculateStats(findings);
        await storeScanResults(findings, scanId, contextName, stats);

        // Send notification after successful scan with findings
        await notificationQueue.add(env.SCAN_NOTIFICATION_QUEUE_NAME, {
          scanId,
          projectId: scanRecord.projectId,
        });
      } catch (error) {
        logger.error("Error storing findings", {
          scanId,
          contextName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        await updateScanStatus(scanId, SCAN_STATUS.Failed, undefined, error);
        throw error;
      }
    } else {
      // No findings - update with zero counts
      const emptyStats = {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        totalFindings: 0,
        avgRiskScore: 0,
        maxRiskScore: 0,
      };
      await updateScanStatus(scanId, SCAN_STATUS.Completed, emptyStats);

      // Send notification for completed scan with no findings
      await notificationQueue.add(env.SCAN_NOTIFICATION_QUEUE_NAME, {
        scanId,
        projectId: scanRecord.projectId,
      });
    }

    logger.info("Scan completed successfully", {
      scanId,
      contextName,
      findingsCount: alerts.length,
    });
  } catch (error) {
    logger.error("Scan failed", {
      scanId,
      contextName,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    await updateScanStatus(scanId, SCAN_STATUS.Failed, undefined, error);
    throw error;
  } finally {
    // Clean up context
    if (contextName) {
      await removeContext(contextName, scanId);
    }
  }
};
