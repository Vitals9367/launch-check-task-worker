declare module "@zaproxy/zap-api-nodejs" {
  export interface ZapClientOptions {
    proxy?: string;
    apiKey?: string;
    skipSSLVerify?: boolean;
  }

  export interface ScanOptions {
    url: string;
    contextId?: string;
    userId?: string;
    recurse?: boolean;
    inScopeOnly?: boolean;
    scanPolicyName?: string;
    method?: string;
    postData?: string;
    [key: string]: any;
  }

  export interface SpiderOptions {
    url: string;
    contextId?: string;
    maxChildren?: number;
    recurse?: boolean;
    subtreeOnly?: boolean;
    [key: string]: any;
  }

  export interface AlertOptions {
    baseurl?: string;
    start?: number;
    count?: number;
    riskId?: string;
  }

  export class ZapClient {
    constructor(options?: ZapClientOptions);

    ascan: {
      scan(options: ScanOptions): Promise<string>;
      status(scanId: string): Promise<string>;
    };

    spider: {
      scan(options: SpiderOptions): Promise<string>;
      status(spiderId: string): Promise<string>;
    };

    alert: {
      alerts(options: AlertOptions): Promise<any[]>;
    };

    core: {
      shutdown(): Promise<void>;
    };
  }
}
