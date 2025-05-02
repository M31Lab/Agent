import * as vscode from 'vscode';
import { v4 as uuidv4 } from 'uuid';
import { 
    BrowserOptions,
    BrowserAction,
    BrowserActionResult,
    BrowserSession,
    BrowserActionType,
    defaultBrowserOptions
} from '../../models/browserInteraction';

export interface BrowserEvent {
    type: 'sessionStarted' | 'sessionEnded' | 'actionStarted' | 'actionCompleted' | 'error' | 'screenshotCaptured' | 'consoleMessage';
    sessionId: string;
    action?: BrowserAction;
    result?: BrowserActionResult;
    error?: string;
    data?: unknown;
    timestamp: number;
}

export class BrowserService implements vscode.Disposable {
    private static instance: BrowserService | undefined;
    private sessions: Map<string, BrowserSession> = new Map();
    private readonly browserProvider: BrowserProvider;
    private readonly eventEmitter = new vscode.EventEmitter<BrowserEvent>();
    private readonly disposables: vscode.Disposable[] = [];

    public readonly onBrowserEvent = this.eventEmitter.event;

    constructor() {
        this.browserProvider = new ChromiumBrowserProvider();
        this.disposables.push(this.eventEmitter);
    }

    public static getInstance(): BrowserService {
        if (!BrowserService.instance) {
            BrowserService.instance = new BrowserService();
        }
        return BrowserService.instance;
    }

    public async createSession(options: Partial<BrowserOptions> = {}): Promise<string> {
        const sessionId = uuidv4();
        const sessionOptions: BrowserOptions = {
            ...defaultBrowserOptions,
            ...options
        };

        const session: BrowserSession = {
            id: sessionId,
            options: sessionOptions,
            status: 'initializing',
            actions: [],
            createdAt: Date.now(),
            lastActivity: Date.now()
        };

        this.sessions.set(sessionId, session);

        try {
            await this.browserProvider.initialize(sessionOptions);
            
            session.status = 'running';
            
            this.emitEvent({
                type: 'sessionStarted',
                sessionId,
                timestamp: Date.now()
            });
            
            return sessionId;
        } catch (error) {
            session.status = 'error';
            session.error = error instanceof Error ? error.message : String(error);
            
            this.emitEvent({
                type: 'error',
                sessionId,
                error: session.error,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }

    private emitEvent(event: BrowserEvent): void {
        this.eventEmitter.fire(event);
    }

    public async executeAction(sessionId: string, action: BrowserAction): Promise<BrowserActionResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Browser session ${sessionId} not found`);
        }

        if (session.status !== 'running') {
            throw new Error(`Browser session ${sessionId} is not running`);
        }

        session.actions.push(action);
        session.lastActivity = Date.now();

        this.emitEvent({
            type: 'actionStarted',
            sessionId,
            action,
            timestamp: Date.now()
        });

        try {
            let result: BrowserActionResult;

            switch (action.type) {
                case BrowserActionType.Navigate:
                    result = await this.browserProvider.navigate(action.url!);
                    break;
                case BrowserActionType.Click:
                    result = await this.browserProvider.click(action.selector!, action.timeout);
                    break;
                case BrowserActionType.Type:
                    result = await this.browserProvider.type(action.selector!, action.text!, action.timeout);
                    break;
                case BrowserActionType.Scroll:
                    result = await this.browserProvider.scroll(action.x, action.y);
                    break;
                case BrowserActionType.Screenshot:
                    result = await this.browserProvider.screenshot(action.selector, action.width, action.height);
                    break;
                case BrowserActionType.GetContent:
                    result = await this.browserProvider.getContent();
                    break;
                case BrowserActionType.GetLogs:
                    result = await this.browserProvider.getLogs();
                    break;
                case BrowserActionType.WaitForSelector:
                    result = await this.browserProvider.waitForSelector(action.selector!, action.timeout);
                    break;
                case BrowserActionType.WaitForNavigation:
                    result = await this.browserProvider.waitForNavigation(action.timeout);
                    break;
                case BrowserActionType.Evaluate:
                    result = await this.browserProvider.evaluate(action.script!);
                    break;
                default:
                    throw new Error(`Unsupported action type: ${action.type}`);
            }

            this.emitEvent({
                type: 'actionCompleted',
                sessionId,
                action,
                result,
                timestamp: Date.now()
            });

            // Forward screenshot and console messages to subscribers
            if (result.screenshot) {
                this.emitEvent({
                    type: 'screenshotCaptured',
                    sessionId,
                    data: { screenshot: result.screenshot },
                    timestamp: Date.now()
                });
            }

            if (result.logs) {
                for (const log of result.logs) {
                    this.emitEvent({
                        type: 'consoleMessage',
                        sessionId,
                        data: { type: log.level, message: log.message },
                        timestamp: Date.now()
                    });
                }
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.emitEvent({
                type: 'error',
                sessionId,
                action,
                error: errorMessage,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }

    public async endSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error(`Browser session ${sessionId} not found`);
        }

        if (session.status === 'closed') {
            return;
        }

        try {
            await this.browserProvider.close();
            
            session.status = 'closed';
            session.endedAt = Date.now();
            
            this.emitEvent({
                type: 'sessionEnded',
                sessionId,
                timestamp: Date.now()
            });
        } catch (error) {
            session.status = 'error';
            session.error = error instanceof Error ? error.message : String(error);
            
            this.emitEvent({
                type: 'error',
                sessionId,
                error: session.error,
                timestamp: Date.now()
            });
            
            throw error;
        }
    }

    public getSession(sessionId: string): BrowserSession | undefined {
        return this.sessions.get(sessionId);
    }

    public getAllSessions(): BrowserSession[] {
        return Array.from(this.sessions.values());
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        
        // Close all active sessions
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.status === 'running') {
                this.endSession(sessionId).catch(error => {
                    console.error(`Error closing browser session ${sessionId}:`, error);
                });
            }
        }
        
        this.browserProvider.dispose();
    }
}

interface BrowserProvider {
    initialize(options: BrowserOptions): Promise<void>;
    navigate(url: string): Promise<BrowserActionResult>;
    click(selector: string, timeout?: number): Promise<BrowserActionResult>;
    type(selector: string, text: string, timeout?: number): Promise<BrowserActionResult>;
    scroll(x?: number, y?: number): Promise<BrowserActionResult>;
    screenshot(selector?: string, width?: number, height?: number): Promise<BrowserActionResult>;
    getContent(): Promise<BrowserActionResult>;
    getLogs(): Promise<BrowserActionResult>;
    waitForSelector(selector: string, timeout?: number): Promise<BrowserActionResult>;
    waitForNavigation(timeout?: number): Promise<BrowserActionResult>;
    evaluate(script: string): Promise<BrowserActionResult>;
    close(): Promise<void>;
    dispose(): void;
}

class ChromiumBrowserProvider implements BrowserProvider {
    private browser: unknown = null;
    private page: unknown = null;
    private consoleLogs: Array<{ level: string; message: string }> = [];

    async initialize(options: BrowserOptions): Promise<void> {
        try {
            const puppeteer = await import('puppeteer-core');
            
            this.browser = await puppeteer.launch({
                headless: options.headless ? 'new' : false,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                ignoreHTTPSErrors: options.ignoreHttpsErrors
            });
            
            this.page = await this.browser.newPage();
            
            await this.page.setViewport({
                width: options.width,
                height: options.height
            });
            
            if (options.userAgent) {
                await this.page.setUserAgent(options.userAgent);
            }
            
            await this.page.setDefaultTimeout(options.timeout);
            
            await this.setupConsoleLogging();
        } catch (error) {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
                this.page = null;
            }
            throw error;
        }
    }

    private async setupConsoleLogging(): Promise<void> {
        if (!this.page) {
            return;
        }
        
        this.consoleLogs = [];
        
        this.page.on('console', (msg: unknown) => {
            const type = msg.type() || 'log';
            let text = msg.text();
            
            // Limit message length to avoid excessive content
            if (text.length > 500) {
                text = text.substring(0, 500) + '... [truncated]';
            }
            
            this.consoleLogs.push({
                level: type,
                message: text
            });
        });
        
        this.page.on('pageerror', (error: Error) => {
            this.consoleLogs.push({
                level: 'error',
                message: error.message
            });
        });
        
        this.page.on('requestfailed', (request: unknown) => {
            const failure = request.failure();
            const errorText = failure ? failure.errorText : 'Unknown error';
            
            this.consoleLogs.push({
                level: 'error',
                message: `Request failed: ${request.url()} - ${errorText}`
            });
        });
    }

    async navigate(url: string): Promise<BrowserActionResult> {
        try {
            const response = await this.page.goto(url, {
                waitUntil: 'networkidle2'
            });
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    url: this.page.url(),
                    status: response.status(),
                    title: await this.page.title()
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async click(selector: string, timeout?: number): Promise<BrowserActionResult> {
        try {
            if (timeout) {
                await this.page.waitForSelector(selector, { timeout });
            } else {
                await this.page.waitForSelector(selector);
            }
            
            await this.page.click(selector);
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    selector
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async type(selector: string, text: string, timeout?: number): Promise<BrowserActionResult> {
        try {
            if (timeout) {
                await this.page.waitForSelector(selector, { timeout });
            } else {
                await this.page.waitForSelector(selector);
            }
            
            await this.page.click(selector, { clickCount: 3 }); // Select all existing text
            await this.page.type(selector, text);
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    selector,
                    text
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async scroll(x: number = 0, y: number = 0): Promise<BrowserActionResult> {
        try {
            await this.page.evaluate((x, y) => {
                window.scrollTo(x, y);
            }, x, y);
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    x,
                    y
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async screenshot(selector?: string, width?: number, height?: number): Promise<BrowserActionResult> {
        try {
            let screenshot: string;
            
            if (selector) {
                await this.page.waitForSelector(selector);
                const element = await this.page.$(selector);
                
                screenshot = await element.screenshot({
                    encoding: 'base64'
                });
            } else {
                const viewportSize = this.page.viewport();
                const viewportWidth = width || viewportSize.width;
                const viewportHeight = height || viewportSize.height;
                
                if (width || height) {
                    await this.page.setViewport({
                        width: viewportWidth,
                        height: viewportHeight
                    });
                }
                
                screenshot = await this.page.screenshot({
                    encoding: 'base64',
                    fullPage: !width && !height
                });
            }
            
            return {
                success: true,
                data: {
                    selector,
                    width,
                    height
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async getContent(): Promise<BrowserActionResult> {
        try {
            const content = await this.page.content();
            
            return {
                success: true,
                data: {
                    content
                },
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async getLogs(): Promise<BrowserActionResult> {
        return {
            success: true,
            data: {
                logs: this.consoleLogs
            },
            logs: [...this.consoleLogs] // Return all logs
        };
    }

    private getLogsSinceLastAction(): Array<{ level: string; message: string }> {
        const logs = [...this.consoleLogs];
        this.consoleLogs = []; // Clear the logs for the next action
        return logs;
    }

    async waitForSelector(selector: string, timeout?: number): Promise<BrowserActionResult> {
        try {
            await this.page.waitForSelector(selector, { timeout });
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    selector
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async waitForNavigation(timeout?: number): Promise<BrowserActionResult> {
        try {
            await this.page.waitForNavigation({ timeout });
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    url: this.page.url(),
                    title: await this.page.title()
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async evaluate(script: string): Promise<BrowserActionResult> {
        try {
            const result = await this.page.evaluate(script);
            
            const screenshot = await this.page.screenshot({
                encoding: 'base64'
            });
            
            return {
                success: true,
                data: {
                    result: typeof result === 'object' ? JSON.stringify(result) : String(result)
                },
                screenshot: `data:image/png;base64,${screenshot}`,
                logs: this.getLogsSinceLastAction()
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            this.consoleLogs = [];
        }
    }

    dispose(): void {
        if (this.browser) {
            this.browser.close().catch((error: Error) => {
                console.error('Error closing browser:', error);
            });
            this.browser = null;
            this.page = null;
            this.consoleLogs = [];
        }
    }
} 