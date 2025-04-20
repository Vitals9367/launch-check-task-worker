import { ZapScanner } from "@/services/zap/client";
import { logger } from "@/logger";
import { waitForZapOperation } from "@/services/zap/utils";
import type { ZapAlert } from "./types";

const zap = new ZapScanner();

/**
 * Creates a new ZAP context for the scan and includes target URLs
 */
export async function createScanContext(
  scanId: string,
  targetUrls: string[]
): Promise<string> {
  const contextName = `scan-${scanId}`;
  await zap.createContext(contextName);

  for (const url of targetUrls) {
    await zap.includeInContext(contextName, url);
  }

  return contextName;
}

/**
 * Runs spider and active scans for a target URL
 */
export async function scanTargetUrl(
  targetUrl: string,
  scanId: string,
  contextName: string
): Promise<void> {
  // Spider scan
  logger.info("Starting spider scan", { scanId, targetUrl, contextName });
  const spiderId = await zap.startSpider(targetUrl, { scanId, contextName });
  await waitForZapOperation(
    () => zap.getSpiderStatus(spiderId),
    "spider",
    scanId,
    targetUrl
  );
  logger.info("Spider scan completed", { scanId, targetUrl });

  // Active scan
  logger.info("Starting active scan", { scanId, targetUrl, contextName });
  const activeScanId = await zap.startActiveScan(targetUrl, {
    scanId,
    contextName,
  });
  await waitForZapOperation(
    () => zap.getScanStatus(activeScanId),
    "active scan",
    scanId,
    targetUrl
  );
  logger.info("Active scan completed", { scanId, targetUrl });
}

/**
 * Gets alerts from ZAP for a given context
 */
export async function getZapAlerts(contextName: string): Promise<ZapAlert[]> {
  return (await zap.getAlerts({ contextName })) as ZapAlert[];
}

/**
 * Removes a ZAP context
 */
export async function removeContext(
  contextName: string,
  scanId: string
): Promise<void> {
  try {
    await zap.removeContext(contextName);
    logger.info("Removed ZAP context", { scanId, contextName });
  } catch (error) {
    logger.error("Error removing ZAP context", {
      scanId,
      contextName,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
