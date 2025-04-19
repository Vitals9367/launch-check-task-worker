import { Job } from "bullmq";
import { db } from "@/db/db";
import {
  scans,
  scanFindings,
  findingInfo,
  findingClassification,
} from "@/db/schema";
import { NucleiService } from "@/services/nuclei/service";
import { SCAN_STATUS } from "@/services/nuclei/types";
import { logger } from "@/logger";
import { eq } from "drizzle-orm";
import { KatanaService } from "@/services/katana/service";

interface ScanRequest {
  targetUrls: string[];
}

interface ScanJob {
  scanId: string;
  request: ScanRequest;
}

const nuclei = new NucleiService();
const katana = new KatanaService();

/**
 * Processes a security scan job and stores results in the database
 */
export const scan = async (job: Job<ScanJob>) => {
  const { scanId, request } = job.data;

  if (!scanId || !request?.targetUrls?.length) {
    throw new Error("Invalid job data: scanId and targetUrls are required");
  }

  try {
    logger.info("Starting scan task", { scanId, targets: request.targetUrls });

    await db
      .update(scans)
      .set({ status: SCAN_STATUS.InProgress })
      .where(eq(scans.id, scanId));

    const results = await nuclei.scanTarget(request.targetUrls);

    // Store scan results
    await db
      .update(scans)
      .set({
        status: SCAN_STATUS.Completed,
        completedAt: new Date(),
        totalFindings: results.findings.length,
        warnings: results.warnings || null,
      })
      .where(eq(scans.id, scanId));

    // Store findings if any
    if (results.findings.length > 0) {
      for (const finding of results.findings) {
        // 1. Create classification record
        const classificationResult = await db
          .insert(findingClassification)
          .values({
            cveId: finding.info?.classification?.["cve-id"] || null,
            cweIds: finding.info?.classification?.["cwe-id"] || [],
          })
          .returning();

        if (!classificationResult[0]) {
          throw new Error("Failed to create classification record");
        }
        const classificationId = classificationResult[0].id;

        // 2. Create info record
        const infoResult = await db
          .insert(findingInfo)
          .values({
            name: finding.info?.name,
            authors: finding.info?.author || [],
            tags: finding.info?.tags || [],
            description: finding.info?.description,
            severity: finding.info?.severity as any,
            metadata: finding.info?.metadata || {},
            classificationId,
          })
          .returning();

        if (!infoResult[0]) {
          throw new Error("Failed to create info record");
        }
        const infoId = infoResult[0].id;

        // 3. Create finding record
        await db.insert(scanFindings).values({
          scanId,
          template: finding.template,
          templateUrl: finding["template-url"],
          templateId: finding["template-id"],
          templatePath: finding["template-path"],
          infoId,
          matcherName: finding["matcher-name"],
          type: finding.type,
          host: finding.host,
          matchedAt: finding["matched-at"],
          request: finding.request,
          matcherStatus: finding["matcher-status"],
        });
      }

      logger.info("Stored findings in database", {
        scanId,
        count: results.findings.length,
      });
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
        status: SCAN_STATUS.Failed,
        errorMessage: errorMessage || "Unknown error",
        completedAt: new Date(),
      })
      .where(eq(scans.id, scanId));

    throw error;
  }
};
