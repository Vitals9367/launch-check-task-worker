import axios, { AxiosInstance } from "axios";

/**
 * Configuration options for the ZAP client
 */
export interface ZapConfig {
  /** The proxy URL where ZAP is listening (default: http://127.0.0.1:8080) */
  proxyUrl?: string;
  /** The API key if required (default: none) */
  apiKey?: string;
}

/**
 * Helper class to manage ZAP scanning operations using direct API calls
 */
export class ZapScanner {
  private baseUrl: string;
  private apiKey: string;
  private client: AxiosInstance;

  constructor(config: ZapConfig = {}) {
    this.baseUrl = config.proxyUrl || "http://127.0.0.1:8080";
    this.apiKey = config.apiKey || "";

    this.client = axios.create({
      baseURL: this.baseUrl,
    });
  }

  private getApiPath(
    component: string,
    action: string,
    isView: boolean = false
  ): string {
    const baseApiPath = "/JSON";
    const actionType = isView ? "view" : "action";
    return `${baseApiPath}/${component}/${actionType}/${action}/${this.apiKey}`;
  }

  /**
   * Create a new context
   * @param contextName Name for the new context
   */
  async createContext(contextName: string): Promise<void> {
    try {
      await this.client.get(this.getApiPath("context", "newContext"), {
        params: { contextName },
      });
    } catch (error) {
      console.error("Failed to create ZAP context:", error);
      throw error;
    }
  }

  /**
   * Include a URL pattern in a context
   * @param contextName Name of the context
   * @param regex Regular expression to match URLs
   */
  async includeInContext(contextName: string, regex: string): Promise<void> {
    try {
      await this.client.get(this.getApiPath("context", "includeInContext"), {
        params: {
          contextName,
          regex: this.escapeUrlForContext(regex),
        },
      });
    } catch (error) {
      console.error("Failed to include URL in ZAP context:", error);
      throw error;
    }
  }

  /**
   * Remove a context
   * @param contextName Name of the context to remove
   */
  async removeContext(contextName: string): Promise<void> {
    try {
      await this.client.get(this.getApiPath("context", "removeContext"), {
        params: { contextName },
      });
    } catch (error) {
      console.error("Failed to remove ZAP context:", error);
      throw error;
    }
  }

  /**
   * Escape a URL pattern for use in context inclusion
   * @param url URL or pattern to escape
   */
  private escapeUrlForContext(url: string): string {
    // Convert URL to regex pattern that matches the exact URL and optional trailing slash
    return `^${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`;
  }

  /**
   * Start a new active scan
   * @param url The target URL to scan
   * @param options Additional scan options
   */
  async startActiveScan(
    url: string,
    options: {
      contextName?: string;
      userId?: string;
      recurse?: boolean;
      inScopeOnly?: boolean;
      scanPolicyName?: string;
      method?: string;
      postData?: string;
      scanId?: string;
    } = {}
  ) {
    try {
      const response = await this.client.get(this.getApiPath("ascan", "scan"), {
        params: {
          url,
          ...options,
          // Add scanId to the scan name for identification
          scanName: options.scanId ? `Scan-${options.scanId}` : undefined,
        },
      });
      return response.data.scan;
    } catch (error) {
      console.error("Failed to start ZAP active scan:", error);
      throw error;
    }
  }

  /**
   * Get the status of a running scan
   * @param scanId The ID of the scan to check
   */
  async getScanStatus(scanId: string) {
    try {
      const response = await this.client.get(
        this.getApiPath("ascan", "status", true),
        {
          params: { scanId },
        }
      );
      const status = response.data.status;
      return {
        status,
        isComplete: status === "100",
      };
    } catch (error) {
      console.error("Failed to get ZAP scan status:", error);
      throw error;
    }
  }

  /**
   * Get alerts (vulnerabilities) found during scanning
   * @param options Optional parameters to filter alerts
   */
  async getAlerts(options: { baseurl?: string; contextName?: string } = {}) {
    try {
      const response = await this.client.get(
        this.getApiPath("core", "alerts", true),
        {
          params: options,
        }
      );
      return response.data.alerts;
    } catch (error) {
      console.error("Failed to get ZAP alerts:", error);
      throw error;
    }
  }

  /**
   * Spider a site to discover URLs
   * @param url The target URL to spider
   * @param options Additional spider options
   */
  async startSpider(
    url: string,
    options: {
      contextName?: string;
      maxChildren?: number;
      recurse?: boolean;
      subtreeOnly?: boolean;
      scanId?: string;
    } = {}
  ) {
    try {
      const response = await this.client.get(
        this.getApiPath("spider", "scan"),
        {
          params: {
            url,
            ...options,
            // Add scanId to the scan name for identification
            scanName: options.scanId ? `Spider-${options.scanId}` : undefined,
          },
        }
      );
      return response.data.scan;
    } catch (error) {
      console.error("Failed to start ZAP spider:", error);
      throw error;
    }
  }

  /**
   * Get the status of a running spider scan
   * @param spiderId The ID of the spider scan to check
   */
  async getSpiderStatus(spiderId: string) {
    try {
      const response = await this.client.get(
        this.getApiPath("spider", "status", true),
        {
          params: { scanId: spiderId },
        }
      );
      const status = response.data.status;
      return {
        status,
        isComplete: status === "100",
      };
    } catch (error) {
      console.error("Failed to get ZAP spider status:", error);
      throw error;
    }
  }

  /**
   * Get the results from a spider scan
   * @param spiderId The ID of the spider scan
   */
  async getSpiderResults(spiderId: string) {
    try {
      const response = await this.client.get(
        this.getApiPath("spider", "results"),
        {
          params: { scanId: spiderId },
        }
      );
      return response.data.results;
    } catch (error) {
      console.error("Failed to get ZAP spider results:", error);
      throw error;
    }
  }

  /**
   * Stop a running scan
   * @param scanId The ID of the scan to stop
   */
  async stopScan(scanId: string) {
    try {
      await this.client.get(this.getApiPath("ascan", "stop"), {
        params: { scanId },
      });
    } catch (error) {
      console.error("Failed to stop ZAP scan:", error);
      throw error;
    }
  }

  /**
   * Stop a running spider scan
   * @param spiderId The ID of the spider scan to stop
   */
  async stopSpider(spiderId: string) {
    try {
      await this.client.get(this.getApiPath("spider", "stop"), {
        params: { scanId: spiderId },
      });
    } catch (error) {
      console.error("Failed to stop ZAP spider:", error);
      throw error;
    }
  }

  /**
   * Shutdown the ZAP instance
   */
  async shutdown() {
    try {
      await this.client.get(this.getApiPath("core", "shutdown"));
    } catch (error) {
      console.error("Failed to shutdown ZAP:", error);
      throw error;
    }
  }
}

// Export a default instance with standard configuration
export const defaultZapScanner = new ZapScanner();
