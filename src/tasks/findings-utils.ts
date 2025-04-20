import type { Finding, ZapAlert, ScanStats } from "./types";
import {
  mapZapRiskToSeverity,
  mapZapConfidence,
  mapZapRiskLevel,
  mapZapRiskToScore,
} from "@/services/zap/utils";

/**
 * Maps ZAP alerts to finding records
 */
export function mapAlertsToFindings(
  alerts: ZapAlert[],
  scanId: string,
  contextName: string
): Finding[] {
  return alerts.map((alert) => ({
    scanId,
    name: alert.name,
    description: alert.description,
    severity: mapZapRiskToSeverity(alert.risk),
    confidence: mapZapConfidence(alert.confidence),
    solution: alert.solution || null,
    reference: alert.reference || null,
    tags: ["zap", "security"],
    riskLevel: mapZapRiskLevel(alert.risk),
    riskScore: mapZapRiskToScore(alert.risk),
    pluginId: alert.pluginId,
    cweIds: alert.cweid ? [alert.cweid] : [],
    wasc: alert.wascid ? [alert.wascid] : [],
    cveId: null,
    url: alert.url,
    method: alert.method || null,
    parameter: alert.parameter || null,
    attack: alert.attack || null,
    evidence: alert.evidence || null,
    otherInfo: alert.otherinfo || null,
    requestHeaders: alert.requestHeader
      ? JSON.parse(alert.requestHeader)
      : null,
    requestBody: alert.requestBody || null,
    responseHeaders: alert.responseHeader
      ? JSON.parse(alert.responseHeader)
      : null,
    metadata: {
      pluginId: alert.pluginId,
      messageId: alert.messageId,
      contextName,
    },
  }));
}

/**
 * Calculates statistics from findings
 */
export function calculateStats(findings: Finding[]): ScanStats {
  const stats: ScanStats = {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
    totalFindings: findings.length,
    avgRiskScore: 0,
    maxRiskScore: 0,
  };

  let totalRiskScore = 0;

  findings.forEach((finding) => {
    // Update severity counts
    switch (finding.severity) {
      case "critical":
        stats.criticalCount++;
        break;
      case "high":
        stats.highCount++;
        break;
      case "medium":
        stats.mediumCount++;
        break;
      case "low":
        stats.lowCount++;
        break;
      case "info":
        stats.infoCount++;
        break;
    }

    // Update risk scores
    const riskScore = finding.riskScore || 0;
    totalRiskScore += riskScore;
    stats.maxRiskScore = Math.max(stats.maxRiskScore, riskScore);
  });

  stats.avgRiskScore =
    findings.length > 0 ? totalRiskScore / findings.length : 0;
  return stats;
}
