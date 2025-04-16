/**
 * Represents the status of a security scan
 */
export enum ScanStatus {
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
 * Information about a security finding
 */
export interface Finding {
  info: {
    /** Title of the finding */
    title: string;
    /** Detailed description */
    description: string;
    /** Severity level */
    severity: "critical" | "high" | "medium" | "low" | "info";
    /** Location where the issue was found */
    location?: string;
    /** Additional metadata */
    [key: string]: unknown;
  };
  /** Additional finding data */
  [key: string]: unknown;
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
  status: ScanStatus;
  /** Total number of findings */
  total_findings: number;
  /** List of security findings */
  findings: Finding[];
  /** Any warnings that occurred during the scan */
  warnings?: string;
}
