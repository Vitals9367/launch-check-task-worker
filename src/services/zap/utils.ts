/**
 * Maps ZAP risk string to numeric score
 */
export function mapZapRiskToScore(risk: number | string): number {
  // If it's already a number, return it
  if (typeof risk === "number") {
    return risk;
  }

  // Map string risk levels to numeric scores
  const riskStr = risk.toLowerCase();
  switch (riskStr) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0; // Info level
  }
}

/**
 * Maps ZAP risk levels to our schema's risk levels
 */
export function mapZapRiskLevel(
  risk: number | string
): "high" | "medium" | "low" | "info" {
  const score = mapZapRiskToScore(risk);
  switch (score) {
    case 3:
      return "high";
    case 2:
      return "medium";
    case 1:
      return "low";
    default:
      return "info";
  }
}

/**
 * Maps ZAP confidence levels to our schema's confidence levels
 */
export function mapZapConfidence(
  confidence: string
): "high" | "medium" | "low" | "confirmed" {
  const level = confidence.toLowerCase();
  switch (level) {
    case "confirmed":
      return "confirmed";
    case "high":
      return "high";
    case "medium":
      return "medium";
    default:
      return "low";
  }
}

/**
 * Maps ZAP risk levels to severity levels
 */
export function mapZapRiskToSeverity(
  risk: number | string
): "critical" | "high" | "medium" | "low" | "info" {
  const score = mapZapRiskToScore(risk);
  switch (score) {
    case 3:
      return "high";
    case 2:
      return "medium";
    case 1:
      return "low";
    default:
      return "info";
  }
}

/**
 * Waits for a ZAP operation to complete by polling its status
 */
export async function waitForZapOperation(
  getStatus: () => Promise<{ status: any; isComplete: boolean }>,
  operationType: string,
  scanId: string,
  targetUrl: string,
  maxRetries = 100,
  intervalMs = 2000
): Promise<void> {
  let retries = 0;
  while (retries < maxRetries) {
    const result = await getStatus();
    if (result.isComplete) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    retries++;
  }
  throw new Error(
    `${operationType} scan timed out after ${
      (maxRetries * intervalMs) / 1000
    } seconds`
  );
}
