import { NucleiError } from "./exceptions";
import {
  NucleiOptions,
  ScanResult,
  SCAN_STATUS,
  NucleiFindingSchema,
  NucleiFinding,
} from "./types";
import { logger } from "@/logger";
import { CliService } from "@/services/cli-service";

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
export class NucleiService extends CliService {
  protected binaryName = "nuclei";

  protected createError(message: string): Error {
    return new NucleiError(message);
  }

  /**
   * Builds the Nuclei command with all necessary arguments
   * @param targets - List of URLs to scan
   * @param options - Scan configuration options
   * @returns Array of command arguments
   */
  protected buildCommand(targets: string[], options: NucleiOptions): string[] {
    const {
      severity,
      templates,
      outputFile,
      rateLimit = DEFAULT_CONFIG.rateLimit,
      timeout = DEFAULT_CONFIG.timeout,
    } = options;

    const command = [
      this.binaryPath,
      "-target",
      targets.join(","),
      "-j",
      "-silent",
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
   * Parses and processes the scan results
   * @param stdout - Command standard output
   * @param stderr - Command standard error
   * @param targets - List of scanned URLs
   * @returns Processed scan results
   */
  protected parseResults(
    stdout: string,
    stderr: string,
    targets: string[]
  ): ScanResult {
    // Log raw output for debugging
    logger.debug("Raw stdout", { stdout: stdout.slice(0, 1000) }); // First 1000 chars
    if (stderr) {
      logger.debug("Raw stderr", { stderr });
    }

    const findings = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          const result = NucleiFindingSchema.safeParse(JSON.parse(line));

          if (!result.success) {
            logger.warn("Invalid finding format", {
              line,
              errors: result.error.errors,
            });
            return null;
          }
          return result.data;
        } catch (error) {
          logger.warn("Failed to parse Nuclei output line", {
            line,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        }
      })
      .filter((result): result is NucleiFinding => result !== null);

    const scanResults: ScanResult = {
      timestamp: new Date().toISOString(),
      target: targets[0] ?? "",
      status: SCAN_STATUS.Completed,
      total_findings: findings.length,
      findings,
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
      throw this.createError(`Scan failed: ${errorMessage}`);
    }
  }
}
