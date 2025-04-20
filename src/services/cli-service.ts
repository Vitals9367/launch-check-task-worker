import which from "which";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { promisify } from "util";
import { logger } from "@/logger";
import { log } from "console";

/**
 * Base service for CLI-based tools
 */
export abstract class CliService {
  protected binaryPath: string = "";
  protected isInitialized = false;
  protected abstract binaryName: string;

  /**
   * Initializes the service by locating the binary
   * @throws {Error} If binary is not found in system PATH
   */
  protected async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.binaryPath = await which(this.binaryName);
      if (!this.binaryPath) {
        throw this.createError(
          `${this.binaryName} binary not found in system PATH`
        );
      }
      this.isInitialized = true;
      logger.info(`${this.binaryName} binary initialized`, {
        path: this.binaryPath,
      });
    } catch (error) {
      throw this.createError(
        `${this.binaryName} binary not found in system PATH`
      );
    }
  }

  /**
   * Executes a command and returns its output
   * @param command - Array of command parts to execute
   * @returns Promise containing stdout and stderr
   * @throws {Error} If command execution fails
   */
  protected async runCommand(
    command: string[]
  ): Promise<{ stdout: string; stderr: string }> {
    if (!command.length) {
      throw this.createError("Empty command provided");
    }

    const cmd = command[0];
    if (!cmd) {
      throw this.createError("Invalid command provided");
    }

    const args = command.slice(1);
    let stdout = "";
    let stderr = "";

    return new Promise((resolve, reject) => {
      logger.debug(`Executing command: ${command.join(" ")}`);

      const child = spawn(cmd, args, {
        stdio: ["pipe", "pipe", "pipe"],
      }) as ChildProcessWithoutNullStreams;

      child.stdout.on("data", (data: Buffer) => {
        logger.info(data);
        stdout += data.toString();
      });

      child.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      child.on("error", (err: Error) => {
        logger.error("Command execution failed", {
          command: command.join(" "),
          error: err.message,
          stdout,
          stderr,
        });
        reject(this.createError(`Failed to start process: ${err.message}`));
      });

      child.on("close", (code: number | null) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          logger.error("Command execution failed", {
            command: command.join(" "),
            exitCode: code,
            stdout,
            stderr,
          });
          reject(
            this.createError(
              `Process exited with code ${code}\nStdout: ${stdout}\nStderr: ${stderr}`
            )
          );
        }
      });
    });
  }

  /**
   * Validates target URLs
   * @param targets - List of URLs to process
   * @throws {Error} If targets are invalid
   */
  protected validateTargets(targets: string[]): void {
    if (!targets.length) {
      throw this.createError("No targets provided");
    }

    if (
      !targets.every(
        (url) => url.startsWith("http://") || url.startsWith("https://")
      )
    ) {
      throw this.createError("All targets must start with http:// or https://");
    }
  }

  /**
   * Creates a service-specific error
   * @param message - Error message
   * @returns Service-specific error instance
   */
  protected abstract createError(message: string): Error;

  /**
   * Builds the command with necessary arguments
   * @param targets - List of URLs to process
   * @param options - Configuration options
   * @returns Array of command arguments
   */
  protected abstract buildCommand(
    targets: string[],
    options: unknown
  ): string[];

  /**
   * Parses and processes the command results
   * @param stdout - Command standard output
   * @param stderr - Command standard error
   * @param targets - List of processed URLs
   * @returns Processed results
   */
  protected abstract parseResults(
    stdout: string,
    stderr: string,
    targets: string[]
  ): unknown;
}
