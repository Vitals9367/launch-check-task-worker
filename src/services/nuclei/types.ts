import { z } from "zod";

/**
 * Represents the status of a security scan
 */
export enum SCAN_STATUS {
  Pending = "pending",
  InProgress = "in_progress",
  Completed = "completed",
  Failed = "failed",
}

/**
 * Configuration options for a Nuclei scan
 */
export interface NucleiOptions {
  /** List of severity levels to scan for */
  severity?: Array<"critical" | "high" | "medium" | "low" | "info">;
  /** List of template paths to use */
  templates?: string[];
  /** Path to save JSON results */
  outputFile?: string;
  /** Number of requests per second */
  rateLimit?: number;
  /** Timeout for each template execution in minutes */
  timeout?: number;
}

/**
 * Results of a security scan
 */
export interface ScanResult {
  /** ISO timestamp of when the scan was performed */
  timestamp: string;
  /** Target that was scanned */
  target: string;
  /** Current status of the scan */
  status: SCAN_STATUS;
  /** Total number of findings */
  total_findings: number;
  /** List of security findings */
  findings: NucleiFinding[];
  /** Any warnings that occurred during the scan */
  warnings?: string;
}

// Zod schema for the classification object
export const ClassificationSchema = z
  .object({
    "cve-id": z.string().nullable().optional(),
    "cwe-id": z.array(z.string()).optional(),
  })
  .passthrough();

// Zod schema for the metadata object - extend as needed
export const MetadataSchema = z
  .object({
    "max-request": z.number().optional(),
  })
  .passthrough(); // Allow additional fields

// Zod schema for the info object
export const InfoSchema = z.object({
  name: z.string().optional(),
  author: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  severity: z.string().optional(),
  metadata: MetadataSchema.optional(),
  classification: ClassificationSchema.optional(),
});

// Zod schema for the finding object
export const NucleiFindingSchema = z
  .object({
    template: z.string().optional(),
    "template-url": z.string().optional(),
    "template-id": z.string().optional(),
    "template-path": z.string().optional(),
    info: InfoSchema.optional(),
    "matcher-name": z.string().optional(),
    type: z.string().optional(),
    host: z.string().optional(),
    "matched-at": z.string().optional(),
    request: z.string().optional(),
    timestamp: z.string().optional(),
    "matcher-status": z.boolean().optional(),
  })
  .passthrough();

// Type inference from the schema
export type NucleiFinding = z.infer<typeof NucleiFindingSchema>;

export interface ScanOptions {
  templates?: string[];
  severity?: string[];
  tags?: string[];
  outputFile?: string;
  timeout?: number;
  rateLimit?: number;
  bulkSize?: number;
  concurrency?: number;
}
