import {
  severityLevelEnum,
  confidenceLevelEnum,
  riskLevelEnum,
} from "@/db/schema";

export interface ScanRequest {
  targetUrls: string[];
}

export interface ScanJob {
  scanId: string;
  request: ScanRequest;
}

export interface SendScanEmailData {
  scanId: string;
  projectId: string;
}

export interface ZapAlert {
  pluginId: string;
  name: string;
  risk: number;
  confidence: string;
  description: string;
  solution?: string;
  reference?: string;
  cweid?: string;
  wascid?: string;
  sourceid?: string;
  url: string;
  method?: string;
  parameter?: string;
  attack?: string;
  evidence?: string;
  otherinfo?: string;
  messageId?: string;
  requestHeader?: string;
  requestBody?: string;
  responseHeader?: string;
  responseBody?: string;
}

export interface ScanStats {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  infoCount: number;
  totalFindings: number;
  avgRiskScore: number;
  maxRiskScore: number;
}

export interface Finding {
  scanId: string;
  name: string;
  description: string;
  severity: (typeof severityLevelEnum.enumValues)[number];
  confidence: (typeof confidenceLevelEnum.enumValues)[number];
  solution: string | null;
  reference: string | null;
  tags: string[];
  riskLevel: (typeof riskLevelEnum.enumValues)[number];
  riskScore: number;
  pluginId: string;
  cweIds: string[];
  wasc: string[];
  cveId: string | null;
  url: string;
  method: string | null;
  parameter: string | null;
  attack: string | null;
  evidence: string | null;
  otherInfo: string | null;
  requestHeaders: Record<string, string> | null;
  requestBody: string | null;
  responseHeaders: Record<string, string> | null;
  metadata: {
    pluginId: string;
    messageId?: string;
    contextName: string;
  };
}
