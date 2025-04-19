import { KatanaError } from "./exceptions";
import { KatanaOptions, CrawlResult, Endpoint } from "./types";
import { SCAN_STATUS } from "@/services/nuclei/types";
import { logger } from "@/logger";
import { CliService } from "@/services/cli-service";

/**
 * Default configuration values for Katana crawls
 */
const DEFAULT_CONFIG = {
  rateLimit: 150,
  timeout: 30,
  depth: 2,
  concurrency: 10,
} as const;

/**
 * Service for crawling web applications using Katana
 * @see https://github.com/projectdiscovery/katana
 */
export class KatanaService extends CliService {
  protected binaryName = "katana";

  protected createError(message: string): Error {
    return new KatanaError(message);
  }

  /**
   * Builds the Katana command with all necessary arguments
   * @param targets - List of URLs to crawl
   * @param options - Crawl configuration options
   * @returns Array of command arguments
   */
  protected buildCommand(targets: string[], options: KatanaOptions): string[] {
    const {
      depth = DEFAULT_CONFIG.depth,
      concurrency = DEFAULT_CONFIG.concurrency,
      outputFile,
      rateLimit = DEFAULT_CONFIG.rateLimit,
      timeout = DEFAULT_CONFIG.timeout,
      headers,
      fields,
      crawlJs,
      crawlRobots,
      crawlSitemap,
      displayFormFields,
    } = options;

    const command = [this.binaryPath, "-u", targets.join(",")];

    if (depth) {
      command.push("-d", depth.toString());
    }

    if (concurrency) {
      command.push("-c", concurrency.toString());
    }

    if (rateLimit) {
      command.push("-rl", rateLimit.toString());
    }

    if (timeout) {
      command.push("-timeout", timeout.toString());
    }

    if (headers?.length) {
      headers.forEach((header) => {
        command.push("-H", header);
      });
    }

    if (fields?.length) {
      command.push("-f", fields.join(","));
    }

    if (crawlJs) {
      command.push("-jc");
    }

    if (crawlRobots) {
      command.push("-kf", "robotstxt");
    }

    if (crawlSitemap) {
      command.push("-kf", "sitemapxml");
    }

    if (displayFormFields) {
      command.push("-field");
    }

    if (outputFile) {
      command.push("-output", outputFile);
    }

    logger.debug("Generated Katana command", { command: command.join(" ") });
    return command;
  }

  /**
   * Parses and processes the crawl results
   * @param stdout - Command standard output
   * @param stderr - Command standard error
   * @param targets - List of crawled URLs
   * @returns Processed crawl results
   */
  protected parseResults(
    stdout: string,
    stderr: string,
    targets: string[]
  ): CrawlResult {
    // Log raw output for debugging
    logger.debug("Raw stdout", { stdout: stdout.slice(0, 1000) }); // First 1000 chars

    if (stderr) {
      logger.debug("Raw stderr", { stderr });
    }

    const endpoints: Endpoint[] = stdout
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => {
        try {
          // Try to parse as JSON
          const result = JSON.parse(line);
          if (!result?.url || !result?.path || !result?.method) {
            logger.warn("Invalid endpoint format", { line });
            return null;
          }
          return result;
        } catch (error) {
          logger.warn("Failed to parse Katana output line", {
            line,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        }
      })
      .filter((result): result is Endpoint => result !== null);

    const crawlResults: CrawlResult = {
      timestamp: new Date().toISOString(),
      target: targets[0] ?? "",
      status: SCAN_STATUS.Completed,
      total_endpoints: endpoints.length,
      endpoints,
    };

    if (stderr) {
      crawlResults.warnings = stderr;
      logger.warn("Crawl completed with warnings", { warnings: stderr });
    }

    return crawlResults;
  }

  /**
   * Crawls specified targets to discover endpoints and web assets
   * @param targets - List of URLs to crawl
   * @param options - Crawl configuration options
   * @returns Crawl results including discovered endpoints and metadata
   * @throws {KatanaError} If crawl fails or targets are invalid
   *
   * @example
   * ```typescript
   * const katana = new KatanaService();
   * const results = await katana.crawlTarget(
   *   ['https://example.com'],
   *   { depth: 2, crawlJs: true }
   * );
   * ```
   */
  async crawlTarget(
    targets: string[],
    options: KatanaOptions = {}
  ): Promise<CrawlResult> {
    this.validateTargets(targets);

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info("Starting web crawl", {
        targets,
        options: {
          ...options,
          depth: options.depth ?? DEFAULT_CONFIG.depth,
          timeout: options.timeout ?? DEFAULT_CONFIG.timeout,
          concurrency: options.concurrency ?? DEFAULT_CONFIG.concurrency,
          rateLimit: options.rateLimit ?? DEFAULT_CONFIG.rateLimit,
        },
      });

      const command = this.buildCommand(targets, options);
      const { stdout, stderr } = await this.runCommand(command);

      // Check if we got any output
      if (!stdout && !stderr) {
        throw this.createError("No output from Katana command");
      }

      const results = this.parseResults(stdout, stderr, targets);

      // Validate results
      if (results.total_endpoints === 0) {
        logger.warn("No endpoints found in crawl", {
          target: targets[0],
          hasStderr: !!stderr,
          outputLength: stdout.length,
        });
      }

      logger.info("Crawl completed successfully", {
        targets,
        totalEndpoints: results.total_endpoints,
        hasWarnings: !!results.warnings,
      });

      return results;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      logger.error("Crawl failed", {
        error: errorMessage,
      });
      throw this.createError(`Crawl failed: ${errorMessage}`);
    }
  }
}
