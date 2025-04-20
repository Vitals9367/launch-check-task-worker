import { SCAN_STATUS } from "../nuclei/types";

/**
 * Configuration options for a Katana crawler
 */
export interface KatanaOptions {
  /** Maximum depth to crawl */
  depth?: number;
  /** Number of concurrent threads */
  concurrency?: number;
  /** Path to save JSON results */
  outputFile?: string;
  /** Number of requests per second */
  rateLimit?: number;
  /** Timeout for requests in seconds */
  timeout?: number;
  /** List of additional headers */
  headers?: string[];
  /** List of fields to display */
  fields?: Array<
    "url" | "path" | "method" | "status" | "body" | "title" | "tag"
  >;
  /** Whether to crawl known JavaScript files */
  crawlJs?: boolean;
  /** Whether to crawl robots.txt */
  crawlRobots?: boolean;
  /** Whether to crawl sitemap.xml */
  crawlSitemap?: boolean;
  /** Whether to display form fields */
  displayFormFields?: boolean;
}

/**
 * Represents a discovered URL endpoint
 */
export interface Endpoint {
  /** Full URL of the endpoint */
  url: string;
  /** Path component of the URL */
  path: string;
  /** HTTP method used */
  method: string;
  /** HTTP status code */
  status?: number;
  /** Response body */
  body?: string;
  /** Page title */
  title?: string;
  /** HTML tag where URL was found */
  tag?: string;
}

/**
 * Results of a crawling operation
 */
export interface CrawlResult {
  /** ISO timestamp of when the crawl was performed */
  timestamp: string;
  /** Target that was crawled */
  target: string;
  /** Current status of the crawl */
  status: SCAN_STATUS;
  /** Total number of endpoints found */
  total_endpoints: number;
  /** List of discovered endpoints */
  endpoints: Endpoint[];
  /** Any warnings that occurred during the crawl */
  warnings?: string;
}
