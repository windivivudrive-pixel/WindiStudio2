export function flowProjectId(url: string): string | null;
export function isFlowGenerationUrl(url: string): boolean;
export function parseFlowImages(value: unknown): string[];
export function captureFlowSessionHeaders(url: string, headers?: Record<string,string>|Array<{name?:string;value?:string}>): boolean;
export function flowSelectExisting(args: {
  tabId: number;
  prompt: string;
  evaluate: (...args: any[]) => Promise<any>;
  cdp: (...args: any[]) => Promise<any>;
}): Promise<{ selected: boolean }>;
export function flowDownloadExisting(args: {
  tabId: number;
  prompt: string;
  evaluate: (...args: any[]) => Promise<any>;
  cdp: (...args: any[]) => Promise<any>;
}): Promise<{ started: boolean }>;
