import { KatanaService } from "./services/katana/service";
import { NucleiService } from "./services/nuclei/service";
import { logger } from "@/logger";

const nuclei = new NucleiService();
const katana = new KatanaService();

async function main() {
  try {
    logger.info("Starting Katana crawler");

    const crawlResponse = await katana.crawlTarget(["https://launchcheck.io"], {
      timeout: 30, // 30 second timeout
      depth: 2, // Limit crawl depth
      concurrency: 10, // Limit concurrent requests
      rateLimit: 150, // Rate limit requests
      crawlJs: true, // Enable JavaScript crawling
      crawlSitemap: true, // Enable sitemap crawling
    });

    logger.info("Crawl completed", {
      totalEndpoints: crawlResponse.total_endpoints,
      target: crawlResponse.target,
    });

    if (crawlResponse.endpoints.length > 0) {
      logger.info("Found endpoints", {
        firstFew: crawlResponse.endpoints.slice(0, 3),
      });
    }

    // Uncomment to run Nuclei scan on discovered endpoints
    // const results = await nuclei.scanTarget(
    //   crawlResponse.endpoints.map(e => e.url)
    // );
    // logger.info("Nuclei scan completed", { results });
  } catch (error) {
    logger.error("Crawl failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
}

main();
