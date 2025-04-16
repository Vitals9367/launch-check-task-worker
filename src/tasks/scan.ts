import { Job } from "bullmq";
import { db } from "@/db/db";
import { scans, scanFindings } from "@/db/schema";
import { NucleiService } from "@/nuclei/service";
import { ScanStatus } from "@/nuclei/types";
import { logger } from "@/logger";
import { eq } from "drizzle-orm";

interface ScanRequest {
  targetUrls: string[];
  severityLevels?: Array<"critical" | "high" | "medium" | "low" | "info">;
  rateLimit?: number;
  timeout?: number;
}

interface JobData {
  scanId: string;
  request: ScanRequest;
}

const nuclei = new NucleiService();

/**
 * Processes a security scan job and stores results in the database
 */
export const scan = async (job: Job<JobData>) => {
  const { scanId, request } = job.data;

  logger.info("Starting scan task", { scanId, targets: request.targetUrls });

  try {
    await db
      .update(scans)
      .set({ status: ScanStatus.InProgress })
      .where(eq(scans.id, scanId));

    // Execute scan
    const results = await nuclei.scanTarget(request.targetUrls, {
      severity: request.severityLevels,
      rateLimit: request.rateLimit,
      timeout: request.timeout,
    });

    // Store scan results
    await db
      .update(scans)
      .set({
        status: ScanStatus.Completed,
        completedAt: new Date(),
        totalFindings: results.findings.length,
        warnings: results.warnings || null,
      })
      .where(eq(scans.id, scanId));

    // Store findings if any
    if (results.findings.length > 0) {
      const findings = results.findings.map((finding) => ({
        scanId,
        title: finding.info.title,
        description: finding.info.description,
        severity: finding.info.severity,
        location: finding.info.location,
      }));

      await db.insert(scanFindings).values(findings);
    }

    logger.info("Scan completed successfully", {
      scanId,
      findingsCount: results.findings.length,
      hasWarnings: Boolean(results.warnings),
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    logger.error("Scan failed", {
      scanId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    await db
      .update(scans)
      .set({
        status: ScanStatus.Failed,
        errorMessage,
        completedAt: new Date(),
      })
      .where(eq(scans.id, scanId));

    throw error;
  }
};
