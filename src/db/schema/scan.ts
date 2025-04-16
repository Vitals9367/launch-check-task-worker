import { sql } from "drizzle-orm";
import {
  pgTable,
  timestamp,
  integer,
  pgEnum,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { ScanFinding } from "./scan-finding";
// import { projects } from "./projects";

// Scan status enum
export const scanStatusEnum = pgEnum("scan_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

// Scan table schema
export const scans = pgTable("scans", {
  id: uuid()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  targetUrls: text().array().notNull(),

  // Scan metadata
  status: scanStatusEnum().notNull().default("pending"),
  startedAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  completedAt: timestamp({ withTimezone: true }),

  // Scan configuration
  rateLimit: integer().notNull().default(150),
  timeout: integer().notNull().default(5),

  // Statistics
  criticalCount: integer().notNull().default(0),
  highCount: integer().notNull().default(0),
  mediumCount: integer().notNull().default(0),
  lowCount: integer().notNull().default(0),
  infoCount: integer().notNull().default(0),
  totalFindings: integer().notNull().default(0),

  // Error handling
  errorMessage: text(),
  warnings: text(),

  // Relathionships
  // projectId: uuid()
  //   .references(() => projects.id, { onDelete: "cascade" })
  //   .notNull(),
});

// Types
export type Scan = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;

// Helper functions
export const getScanDuration = (scan: Scan): number | null => {
  if (!scan.completedAt || !scan.startedAt) return null;
  return (scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000;
};

export const updateSeverityCounts = (
  findings: ScanFinding[]
): Pick<
  NewScan,
  | "criticalCount"
  | "highCount"
  | "mediumCount"
  | "lowCount"
  | "infoCount"
  | "totalFindings"
> => {
  const severityCount = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  for (const finding of findings) {
    severityCount[finding.severity]++;
  }

  return {
    criticalCount: severityCount.critical,
    highCount: severityCount.high,
    mediumCount: severityCount.medium,
    lowCount: severityCount.low,
    infoCount: severityCount.info,
    totalFindings: findings.length,
  };
};
