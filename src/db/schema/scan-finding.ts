import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  varchar,
  timestamp,
  integer,
  pgEnum,
  text,
  boolean,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { scans } from "./scan";

// Severity level enum
export const severityLevelEnum = pgEnum("severity_level", [
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

// Classification type for findings
export const findingClassification = pgTable("finding_classifications", {
  id: uuid()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  cveId: varchar({ length: 50 }),
  cweIds: text().array(),
});

// Info type for findings
export const findingInfo = pgTable("finding_info", {
  id: uuid()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),
  name: varchar({ length: 255 }),
  authors: text().array(),
  tags: text().array(),
  description: text(),
  severity: severityLevelEnum(),
  metadata: jsonb(), // Store additional metadata as JSON
  classificationId: uuid().references(() => findingClassification.id, {
    onDelete: "cascade",
  }),
});

// Scan findings table schema
export const scanFindings = pgTable("scan_findings", {
  id: uuid()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),

  scanId: uuid()
    .references(() => scans.id, { onDelete: "cascade" })
    .notNull(),

  // Template information
  template: varchar({ length: 255 }),
  templateUrl: varchar({ length: 2048 }),
  templateId: varchar({ length: 255 }),
  templatePath: varchar({ length: 2048 }),

  // Finding info reference
  infoId: uuid()
    .references(() => findingInfo.id, { onDelete: "cascade" })
    .notNull(),

  // Match details
  matcherName: varchar({ length: 255 }),
  type: varchar({ length: 100 }),
  host: varchar({ length: 2048 }),
  matchedAt: varchar({ length: 2048 }),
  request: text(),
  matcherStatus: boolean(),

  // Metadata
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Types
export type ScanFinding = typeof scanFindings.$inferSelect;
export type NewScanFinding = typeof scanFindings.$inferInsert;
export type FindingInfo = typeof findingInfo.$inferSelect;
export type NewFindingInfo = typeof findingInfo.$inferInsert;
export type FindingClassification = typeof findingClassification.$inferSelect;
export type NewFindingClassification =
  typeof findingClassification.$inferInsert;
