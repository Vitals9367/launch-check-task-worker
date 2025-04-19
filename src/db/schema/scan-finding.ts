import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  timestamp,
  pgEnum,
  text,
  jsonb,
  uuid,
  integer,
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

// Confidence level enum for ZAP findings
export const confidenceLevelEnum = pgEnum("confidence_level", [
  "high",
  "medium",
  "low",
  "confirmed",
]);

// Risk level enum for raw ZAP risk scores
export const riskLevelEnum = pgEnum("risk_level", [
  "high",
  "medium",
  "low",
  "info",
]);

// Consolidated scan findings table schema
export const scanFindings = pgTable("scan_findings", {
  id: uuid()
    .primaryKey()
    .notNull()
    .default(sql`gen_random_uuid()`),

  // Scan reference
  scanId: uuid()
    .references(() => scans.id, { onDelete: "cascade" })
    .notNull(),

  // Finding Info fields
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull(),
  severity: severityLevelEnum().notNull(),
  confidence: confidenceLevelEnum().notNull(),
  solution: text(), // How to fix the vulnerability
  reference: text(), // Reference URLs and documentation
  tags: text().array(),

  // Raw ZAP specific fields
  riskLevel: riskLevelEnum().notNull(),
  riskScore: integer(), // Numeric risk score from ZAP
  pluginId: varchar({ length: 50 }).notNull(), // ZAP Plugin/Rule ID

  // Classification fields
  cveId: varchar({ length: 50 }),
  cweIds: text().array(),
  wasc: text().array(), // Web Application Security Consortium IDs

  // Location information
  url: varchar({ length: 2048 }).notNull(), // The affected URL
  method: varchar({ length: 10 }), // HTTP method (GET, POST, etc.)
  parameter: varchar({ length: 255 }), // Affected parameter
  attack: text(), // The attack string used
  evidence: text(), // Evidence of the vulnerability
  otherInfo: text(), // Additional context

  // Request/Response details (excluding response body to save space)
  requestHeaders: jsonb(), // HTTP request headers
  requestBody: text(), // HTTP request body
  responseHeaders: jsonb(), // HTTP response headers

  // Additional metadata
  metadata: jsonb(),

  // Timestamps
  createdAt: timestamp({ withTimezone: true })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Types
export type ScanFinding = typeof scanFindings.$inferSelect;
export type NewScanFinding = typeof scanFindings.$inferInsert;
