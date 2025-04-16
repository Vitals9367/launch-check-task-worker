import which from "which";
import { exec } from "child_process";
import { promisify } from "util";
import { NucleiError } from "./exceptions";
import { NucleiOptions, ScanResult, Finding, ScanStatus } from "./types";
import { logger } from "@/logger";

const execAsync = promisify(exec);

/**
 * Default configuration values for Nuclei scans
 */
const DEFAULT_CONFIG = {
  rateLimit: 150,
  timeout: 5,
} as const;

/**
 * Service for running security scans using Nuclei
 * @see https://github.com/projectdiscovery/nuclei
 */
export class NucleiService {
  private nucleiPath: string = "";
  private isInitialized = false;

  /**
   * Initializes the Nuclei service by locating the nuclei binary
   * @throws {NucleiError} If nuclei binary is not found in system PATH
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.nucleiPath = await which("nuclei");
      if (!this.nucleiPath) {
        throw new NucleiError("Nuclei binary not found in system PATH");
      }
      this.isInitialized = true;
      logger.info("Nuclei binary initialized", { path: this.nucleiPath });
    } catch (error) {
      throw new NucleiError("Nuclei binary not found in system PATH");
    }
  }

  /**
   * Executes a command and returns its output
   * @param command - Array of command parts to execute
   * @returns Promise containing stdout and stderr
   * @throws {NucleiError} If command execution fails
   */
  private async runCommand(
    command: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execAsync(command.join(" "));
      return { stdout, stderr };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new NucleiError(
        `Failed to execute Nuclei command: ${errorMessage}`
      );
    }
  }

  /**
   * Builds the Nuclei command with all necessary arguments
   * @param targets - List of URLs to scan
   * @param options - Scan configuration options
   * @returns Array of command arguments
   */
  private buildCommand(targets: string[], options: NucleiOptions): string[] {
    const {
      severity,
      templates,
      outputFile,
      rateLimit = DEFAULT_CONFIG.rateLimit,
      timeout = DEFAULT_CONFIG.timeout,
    } = options;

    const command = [
      this.nucleiPath,
      "-target",
      targets.join(","),
      "-j",
      "-rate-limit",
      rateLimit.toString(),
      "-timeout",
      timeout.toString(),
      "-fhr",
      "-uc",
      "-headless",
    ];

    if (severity?.length) {
      command.push("-severity", severity.join(","));
    }

    if (templates?.length) {
      command.push("-t", templates.join(","));
    }

    if (outputFile) {
      command.push("-output", outputFile);
    }

    return command;
  }

  /**
   * Validates scan targets
   * @param targets - List of URLs to scan
   * @throws {NucleiError} If targets are invalid
   */
  private validateTargets(targets: string[]): void {
    if (!targets.length) {
      throw new NucleiError("No targets provided for scanning");
    }

    if (
      !targets.every(
        (url) => url.startsWith("http://") || url.startsWith("https://")
      )
    ) {
      throw new NucleiError("All targets must start with http:// or https://");
    }
  }

  /**
   * Parses and processes the scan results
   * @param stdout - Command standard output
   * @param stderr - Command standard error
   * @param targets - List of scanned URLs
   * @returns Processed scan results
   */
  private parseResults(
    stdout: string,
    stderr: string,
    targets: string[]
  ): ScanResult {
    const results: Finding[] = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          const result = JSON.parse(line);
          // Validate required fields
          if (
            !result?.info?.title ||
            !result?.info?.description ||
            !result?.info?.severity
          ) {
            logger.warn("Invalid finding format", { line });
            return null;
          }
          return result;
        } catch (error) {
          logger.warn("Failed to parse Nuclei output line", {
            line,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        }
      })
      .filter((result): result is Finding => result !== null);

    const scanResults: ScanResult = {
      timestamp: new Date().toISOString(),
      target: targets[0] ?? "",
      status: ScanStatus.Completed,
      total_findings: results.length,
      findings: results,
    };

    if (stderr) {
      scanResults.warnings = stderr;
      logger.warn("Scan completed with warnings", { warnings: stderr });
    }

    return scanResults;
  }

  /**
   * Runs a security scan against specified targets
   * @param targets - List of URLs to scan
   * @param options - Scan configuration options
   * @returns Scan results including findings and metadata
   * @throws {NucleiError} If scan fails or targets are invalid
   *
   * @example
   * ```typescript
   * const nuclei = new NucleiService();
   * const results = await nuclei.scanTarget(
   *   ['https://example.com'],
   *   { severity: ['high', 'critical'] }
   * );
   * ```
   */
  async scanTarget(
    targets: string[],
    options: NucleiOptions = {}
  ): Promise<ScanResult> {
    this.validateTargets(targets);

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info("Starting security scan", { targets, options });
      const command = this.buildCommand(targets, options);
      const { stdout, stderr } = await this.runCommand(command);
      const results = this.parseResults(stdout, stderr, targets);

      logger.info("Scan completed successfully", {
        targets,
        totalFindings: results.total_findings,
      });

      return results;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new NucleiError(`Scan failed: ${errorMessage}`);
    }
  }
}
