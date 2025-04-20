import { db } from "@/db/db";
import { scans, scanFindings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SCAN_STATUS } from "@/services/nuclei/types";
import { logger } from "@/logger";
import type { ScanStats } from "./types";

/**
 * Updates scan status and statistics in the database
 */
export async function updateScanStatus(
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
 * Fetches a scan record by ID
 */
export async function getScanRecord(scanId: string) {
  const scanRecord = await db.query.scans.findFirst({
    where: eq(scans.id, scanId),
  });

  if (!scanRecord) {
    throw new Error(`Scan record not found for ID: ${scanId}`);
  }

  return scanRecord;
}

/**
 * Stores findings and updates scan statistics
 */
export async function storeScanResults(
  findings: any[],
  scanId: string,
  contextName: string,
  stats: ScanStats
): Promise<void> {
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
