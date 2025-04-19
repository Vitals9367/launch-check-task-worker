import { Job } from "bullmq";
import { db } from "@/db/db";
import {
  scans,
  scanFindings,
  severityLevelEnum,
  confidenceLevelEnum,
  riskLevelEnum,
} from "@/db/schema";
import { SCAN_STATUS } from "@/services/nuclei/types";
import { logger } from "@/logger";
import { eq } from "drizzle-orm";
import { ZapScanner } from "@/services/zap/client";
import {
  mapZapRiskToSeverity,
  waitForZapOperation,
  mapZapConfidence,
  mapZapRiskLevel,
  mapZapRiskToScore,
} from "@/services/zap/utils";

// Types
interface ScanRequest {
  targetUrls: string[];
}

interface ScanJob {
  scanId: string;
  request: ScanRequest;
}

interface ZapAlert {
  pluginId: string;
  name: string;
  risk: number;
  confidence: string;
  description: string;
  solution?: string;
  reference?: string;
  cweid?: string;
  wascid?: string;
  sourceid?: string;
  url: string;
  method?: string;
  parameter?: string;
  attack?: string;
  evidence?: string;
  otherinfo?: string;
  messageId?: string;
  requestHeader?: string;
  requestBody?: string;
  responseHeader?: string;
  responseBody?: string;
}

interface ScanStats {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  totalFindings: number;
  avgRiskScore: number;
  maxRiskScore: number;
}

interface Finding {
  scanId: string;
  name: string;
  description: string;
  severity: (typeof severityLevelEnum.enumValues)[number];
  confidence: (typeof confidenceLevelEnum.enumValues)[number];
  solution: string | null;
  reference: string | null;
  tags: string[];
  riskLevel: (typeof riskLevelEnum.enumValues)[number];
  riskScore: number;
  pluginId: string;
  cweIds: string[];
  wasc: string[];
  cveId: string | null;
  url: string;
  method: string | null;
  parameter: string | null;
  attack: string | null;
  evidence: string | null;
  otherInfo: string | null;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  responseHeaders: Record<string, string> | null;
  metadata: {
    pluginId: string;
    messageId?: string;
    contextName: string;
  };
}

const zap = new ZapScanner();

/**
 * Updates scan status and statistics in the database
 */
async function updateScanStatus(
  scanId: string,
  status: (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS],
  stats?: Partial<ScanStats>,
  error?: unknown
): Promise<void> {
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : error
      ? "Unknown error occurred"
      : null;

  await db
    .update(scans)
    .set({
      status,
      completedAt: new Date(),
      errorMessage,
      ...stats,
    })
    .where(eq(scans.id, scanId));
}

/**
 * Creates a new ZAP context for the scan and includes target URLs
 */
async function createScanContext(
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
async function scanTargetUrl(
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
 * Maps ZAP alerts to finding records
 */
function mapAlertsToFindings(
  alerts: ZapAlert[],
  scanId: string,
  contextName: string
): Finding[] {
  return alerts.map((alert) => ({
    scanId,
    name: alert.name,
    description: alert.description,
    severity: mapZapRiskToSeverity(alert.risk),
    confidence: mapZapConfidence(alert.confidence),
    solution: alert.solution || null,
    reference: alert.reference || null,
    tags: ["zap", "security"],
    riskLevel: mapZapRiskLevel(alert.risk),
    riskScore: mapZapRiskToScore(alert.risk),
    pluginId: alert.pluginId,
    cweIds: alert.cweid ? [alert.cweid] : [],
    wasc: alert.wascid ? [alert.wascid] : [],
    cveId: null,
    url: alert.url,
    method: alert.method || null,
    parameter: alert.parameter || null,
    attack: alert.attack || null,
    evidence: alert.evidence || null,
    otherInfo: alert.otherinfo || null,
    requestHeaders: alert.requestHeader
      ? JSON.parse(alert.requestHeader)
      : null,
    requestBody: alert.requestBody || null,
    responseHeaders: alert.responseHeader
      ? JSON.parse(alert.responseHeader)
      : null,
    metadata: {
      pluginId: alert.pluginId,
      messageId: alert.messageId,
      contextName,
    },
  }));
}

/**
 * Calculates statistics from findings
 */
function calculateStats(findings: Finding[]): ScanStats {
  const stats: ScanStats = {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
    totalFindings: findings.length,
    avgRiskScore: 0,
    maxRiskScore: 0,
  };

  let totalRiskScore = 0;

  findings.forEach((finding) => {
    // Update severity counts
    switch (finding.severity) {
      case severityLevelEnum.enumValues[0]: // CRITICAL
        stats.criticalCount++;
        break;
      case severityLevelEnum.enumValues[1]: // HIGH
        stats.highCount++;
        break;
      case severityLevelEnum.enumValues[2]: // MEDIUM
        stats.mediumCount++;
        break;
      case severityLevelEnum.enumValues[3]: // LOW
        stats.lowCount++;
        break;
      case severityLevelEnum.enumValues[4]: // INFO
        stats.infoCount++;
        break;
    }

    // Update risk scores
    const riskScore = finding.riskScore || 0;
    totalRiskScore += riskScore;
    stats.maxRiskScore = Math.max(stats.maxRiskScore, riskScore);
  });

  stats.avgRiskScore =
    findings.length > 0 ? totalRiskScore / findings.length : 0;
  return stats;
}

/**
 * Stores findings and updates scan statistics
 */
async function storeScanResults(
  findings: Finding[],
  scanId: string,
  contextName: string
): Promise<void> {
  const stats = calculateStats(findings);

  // Bulk insert findings
  await db.insert(scanFindings).values(findings);

  // Update scan with statistics
  await updateScanStatus(scanId, SCAN_STATUS.Completed, stats);

  logger.info("Stored findings in database with statistics", {
    scanId,
    contextName,
    stats,
  });
}

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
    const alerts = (await zap.getAlerts({ contextName })) as ZapAlert[];

    if (alerts.length > 0) {
      try {
        const findings = mapAlertsToFindings(alerts, scanId, contextName);
        await storeScanResults(findings, scanId, contextName);
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
      await updateScanStatus(scanId, SCAN_STATUS.Completed, {
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        infoCount: 0,
        totalFindings: 0,
        avgRiskScore: 0,
        maxRiskScore: 0,
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
  }
};
