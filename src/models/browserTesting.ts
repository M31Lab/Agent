import { BrowserActionType } from './browserInteraction';

export interface BrowserTestingOptions {
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  deviceEmulation?: string;
  recordScreenshots: boolean;
  recordConsole: boolean;
  recordNetwork: boolean;
  waitForPageLoad: boolean;
  timeout: number;
}

export const defaultBrowserTestingOptions: BrowserTestingOptions = {
  url: 'http://localhost:3000',
  viewport: {
    width: 1280,
    height: 800,
  },
  recordScreenshots: true,
  recordConsole: true,
  recordNetwork: false,
  waitForPageLoad: true,
  timeout: 30000,
};

export interface BrowserTestStep {
  id: string;
  name: string;
  action: BrowserActionType;
  parameters?: Record<string, unknown>;
  waitForSelector?: string;
  waitForNavigation?: boolean;
  screenshot?: boolean;
  description?: string;
}

export interface BrowserTestResult {
  success: boolean;
  stepId?: string;
  screenshot?: string; // Base64 encoded image
  consoleOutput?: Array<{ type: string; message: string; timestamp: number }>;
  networkRequests?: Array<{ url: string; method: string; status: number; timestamp: number }>;
  error?: string;
  timestamp: number;
  htmlSnapshot?: string;
  metrics?: {
    loadTime?: number;
    domContentLoaded?: number;
    firstPaint?: number;
    firstContentfulPaint?: number;
  };
}

export interface BrowserTestSuite {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  steps: BrowserTestStep[];
  created: number;
  lastRun?: number;
  lastResult?: {
    success: boolean;
    failedStep?: string;
    error?: string;
  };
}

export interface BrowserTestExecution {
  id: string;
  suiteId: string;
  startTime: number;
  endTime?: number;
  steps: Array<{
    stepId: string;
    result: BrowserTestResult;
  }>;
  success?: boolean;
  error?: string;
}

export enum ElementInteractionType {
  Click = 'click',
  DoubleClick = 'doubleClick',
  Hover = 'hover',
  Type = 'type',
  Clear = 'clear',
  Select = 'select',
  Check = 'check',
  Uncheck = 'uncheck',
  Focus = 'focus',
  Blur = 'blur',
  Upload = 'upload',
  DragAndDrop = 'dragAndDrop',
}

export interface ElementInteraction {
  type: ElementInteractionType;
  selector: string;
  value?: string;
  position?: { x: number; y: number };
  frameSelector?: string;
  options?: {
    delay?: number;
    button?: 'left' | 'right' | 'middle';
    force?: boolean;
  };
}

export enum BrowserTestingEventType {
  TestStarted = 'testStarted',
  TestCompleted = 'testCompleted',
  TestFailed = 'testFailed',
  StepStarted = 'stepStarted',
  StepCompleted = 'stepCompleted',
  StepFailed = 'stepFailed',
  ScreenshotCaptured = 'screenshotCaptured',
  ConsoleMessage = 'consoleMessage',
  NetworkRequest = 'networkRequest',
  Error = 'error',
}
