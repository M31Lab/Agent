export interface BrowserOptions {
  headless: boolean;
  width: number;
  height: number;
  timeout: number;
  userAgent?: string;
  ignoreHttpsErrors?: boolean;
}

export const defaultBrowserOptions: BrowserOptions = {
  headless: true,
  width: 1280,
  height: 800,
  timeout: 30000,
  ignoreHttpsErrors: true,
};

export interface BrowserAction {
  type: BrowserActionType;
  selector?: string;
  url?: string;
  text?: string;
  script?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  keys?: string[];
  timeout?: number;
  waitForNavigation?: boolean;
}

export enum BrowserActionType {
  Navigate = 'navigate',
  Click = 'click',
  Type = 'type',
  Scroll = 'scroll',
  Screenshot = 'screenshot',
  GetContent = 'getContent',
  GetLogs = 'getLogs',
  WaitForSelector = 'waitForSelector',
  WaitForNavigation = 'waitForNavigation',
  Evaluate = 'evaluate',
  Close = 'close',
}

export interface BrowserActionResult {
  success: boolean;
  data?: unknown;
  screenshot?: string;
  logs?: BrowserLog[];
  error?: string;
}

export interface BrowserLog {
  level: string;
  message: string;
  type?: 'error' | 'warning' | 'info' | 'log';
  timestamp?: number;
}

export interface BrowserSession {
  id: string;
  options: BrowserOptions;
  status: 'initializing' | 'running' | 'closed' | 'error';
  createdAt: number;
  lastActivity: number;
  endedAt?: number;
  actions: BrowserAction[];
  error?: string;
}
