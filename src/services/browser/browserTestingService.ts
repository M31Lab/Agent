import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ExtensionContext } from '../../models/context/extensionContext';
import { BrowserService } from './browserService';
import { 
    BrowserTestingOptions,
    BrowserTestStep,
    BrowserTestResult,
    BrowserTestSuite,
    BrowserTestExecution,
    BrowserTestingEventType,
    defaultBrowserTestingOptions,
    ElementInteraction,
    _ElementInteractionType
} from '../../models/browserTesting';
import { BrowserActionType } from '../../models/browserInteraction';

export interface BrowserTestingEvent {
    type: BrowserTestingEventType;
    suiteId?: string;
    executionId?: string;
    stepId?: string;
    screenshot?: string;
    consoleMessage?: {
        type: string;
        message: string;
    };
    error?: string;
    data?: unknown;
    timestamp: number;
}

export class BrowserTestingService implements vscode.Disposable {
    private static instance: BrowserTestingService | undefined;
    
    private readonly browserService: BrowserService;
    private readonly eventEmitter = new vscode.EventEmitter<BrowserTestingEvent>();
    private readonly disposables: vscode.Disposable[] = [];
    private readonly context: ExtensionContext;
    private readonly storageDir: string;
    
    private testSuites: Map<string, BrowserTestSuite> = new Map();
    private testExecutions: Map<string, BrowserTestExecution> = new Map();
    private activeExecutions: Map<string, { 
        browserId: string, 
        execution: BrowserTestExecution, 
        currentStepIndex: number 
    }> = new Map();
    
    public readonly onBrowserTestingEvent = this.eventEmitter.event;
    
    private constructor(context: ExtensionContext) {
        this.context = context;
        this.browserService = context.browserService || BrowserService.getInstance();
        this.disposables.push(this.eventEmitter);
        
        this.storageDir = path.join(context.globalStoragePath, 'browser-tests');
        
        // Listen for browser events to capture screenshots and console logs
        this.browserService.onBrowserEvent(event => {
            if (event.type === 'screenshotCaptured') {
                // Find the active execution that uses this browser session
                const activeExecution = Array.from(this.activeExecutions.entries())
                    .find(([_, data]) => data.browserId === event.sessionId);
                    
                if (activeExecution) {
                    const [executionId, data] = activeExecution;
                    
                    this.emitEvent({
                        type: BrowserTestingEventType.ScreenshotCaptured,
                        executionId,
                        screenshot: event.data.screenshot,
                        stepId: data.execution.steps[data.currentStepIndex]?.stepId
                    });
                }
            } else if (event.type === 'consoleMessage') {
                // Find the active execution that uses this browser session
                const activeExecution = Array.from(this.activeExecutions.entries())
                    .find(([_, data]) => data.browserId === event.sessionId);
                    
                if (activeExecution) {
                    const [executionId, _] = activeExecution;
                    
                    this.emitEvent({
                        type: BrowserTestingEventType.ConsoleMessage,
                        executionId,
                        consoleMessage: {
                            type: event.data.type,
                            message: event.data.message
                        }
                    });
                }
            }
        });
    }
    
    public static getInstance(context?: ExtensionContext): BrowserTestingService {
        if (!BrowserTestingService.instance && context) {
            BrowserTestingService.instance = new BrowserTestingService(context);
            BrowserTestingService.instance.initialize().catch(error => {
                console.error('Failed to initialize browser testing service:', error);
            });
        }
        
        if (!BrowserTestingService.instance) {
            throw new Error('Browser testing service not initialized');
        }
        
        return BrowserTestingService.instance;
    }
    
    private async initialize(): Promise<void> {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
            
            const suitesDir = path.join(this.storageDir, 'suites');
            await fs.mkdir(suitesDir, { recursive: true });
            
            const resultsDir = path.join(this.storageDir, 'results');
            await fs.mkdir(resultsDir, { recursive: true });
            
            await this.loadTestSuites();
            
            this.context.loggingService.info('Browser testing service initialized');
        } catch (error) {
            this.context.loggingService.error('Failed to initialize browser testing service', error);
        }
    }
    
    private async loadTestSuites(): Promise<void> {
        try {
            const suitesDir = path.join(this.storageDir, 'suites');
            const files = await fs.readdir(suitesDir);
            
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path.join(suitesDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        const suite = JSON.parse(content) as BrowserTestSuite;
                        
                        this.testSuites.set(suite.id, suite);
                    } catch (error) {
                        this.context.loggingService.error(`Error loading test suite from ${file}:`, error);
                    }
                }
            }
            
            this.context.loggingService.info(`Loaded ${this.testSuites.size} browser test suites`);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                this.context.loggingService.error('Error loading browser test suites:', error);
            }
        }
    }
    
    public async createTestSuite(
        name: string,
        baseUrl: string,
        description: string = ''
    ): Promise<string> {
        const suite: BrowserTestSuite = {
            id: uuidv4(),
            name,
            description,
            baseUrl,
            steps: [],
            created: Date.now()
        };
        
        this.testSuites.set(suite.id, suite);
        
        await this.saveTestSuite(suite);
        
        return suite.id;
    }
    
    public async addStepToTestSuite(
        suiteId: string,
        step: Omit<BrowserTestStep, 'id'>
    ): Promise<string> {
        const suite = this.testSuites.get(suiteId);
        if (!suite) {
            throw new Error(`Test suite ${suiteId} not found`);
        }
        
        const newStep: BrowserTestStep = {
            ...step,
            id: uuidv4()
        };
        
        suite.steps.push(newStep);
        
        await this.saveTestSuite(suite);
        
        return newStep.id;
    }
    
    public async updateTestSuite(suite: BrowserTestSuite): Promise<void> {
        if (!this.testSuites.has(suite.id)) {
            throw new Error(`Test suite ${suite.id} not found`);
        }
        
        this.testSuites.set(suite.id, suite);
        
        await this.saveTestSuite(suite);
    }
    
    public async deleteTestSuite(suiteId: string): Promise<boolean> {
        if (!this.testSuites.has(suiteId)) {
            return false;
        }
        
        this.testSuites.delete(suiteId);
        
        try {
            const filePath = path.join(this.storageDir, 'suites', `${suiteId}.json`);
            await fs.unlink(filePath);
            return true;
        } catch (error) {
            this.context.loggingService.error(`Error deleting test suite ${suiteId}:`, error);
            throw error;
        }
    }
    
    private async saveTestSuite(suite: BrowserTestSuite): Promise<void> {
        try {
            const filePath = path.join(this.storageDir, 'suites', `${suite.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(suite, null, 2), 'utf8');
        } catch (error) {
            this.context.loggingService.error(`Error saving test suite ${suite.id}:`, error);
            throw error;
        }
    }
    
    public getAllTestSuites(): BrowserTestSuite[] {
        return Array.from(this.testSuites.values());
    }
    
    public getTestSuiteById(suiteId: string): BrowserTestSuite | undefined {
        return this.testSuites.get(suiteId);
    }
    
    public async executeTestSuite(
        suiteId: string,
        options: Partial<BrowserTestingOptions> = {}
    ): Promise<string> {
        const suite = this.testSuites.get(suiteId);
        if (!suite) {
            throw new Error(`Test suite ${suiteId} not found`);
        }
        
        // Merge options with defaults
        const testOptions: BrowserTestingOptions = {
            ...defaultBrowserTestingOptions,
            ...options,
            url: options.url || suite.baseUrl
        };
        
        // Create test execution record
        const execution: BrowserTestExecution = {
            id: uuidv4(),
            suiteId,
            startTime: Date.now(),
            steps: []
        };
        
        this.testExecutions.set(execution.id, execution);
        
        // Start browser session
        const browserId = await this.browserService.createSession({
            headless: true,
            width: testOptions.viewport.width,
            height: testOptions.viewport.height,
            userAgent: testOptions.deviceEmulation ? 
                `Mozilla/5.0 (${testOptions.deviceEmulation})` : 
                undefined
        });
        
        // Store active execution
        this.activeExecutions.set(execution.id, {
            browserId,
            execution,
            currentStepIndex: 0
        });
        
        // Emit event
        this.emitEvent({
            type: BrowserTestingEventType.TestStarted,
            suiteId,
            executionId: execution.id
        });
        
        // Start test execution in the background
        this.executeTestSteps(execution.id, browserId, testOptions)
            .catch(error => {
                this.context.loggingService.error(`Error during test execution ${execution.id}:`, error);
            });
        
        return execution.id;
    }
    
    private async executeTestSteps(
        executionId: string,
        browserId: string,
        options: BrowserTestingOptions
    ): Promise<void> {
        const executionData = this.activeExecutions.get(executionId);
        if (!executionData) {
            throw new Error(`Execution ${executionId} not found in active executions`);
        }
        
        const { execution } = executionData;
        const suite = this.testSuites.get(execution.suiteId);
        
        if (!suite) {
            throw new Error(`Test suite ${execution.suiteId} not found`);
        }
        
        try {
            // Navigate to starting URL
            const navigationResult = await this.browserService.executeAction(browserId, {
                type: BrowserActionType.Navigate,
                url: options.url
            });
            
            if (!navigationResult.success) {
                throw new Error(`Navigation failed: ${navigationResult.error}`);
            }
            
            // Execute each step
            for (let i = 0; i < suite.steps.length; i++) {
                const step = suite.steps[i];
                
                // Update current step index
                executionData.currentStepIndex = i;
                
                // Emit step started event
                this.emitEvent({
                    type: BrowserTestingEventType.StepStarted,
                    executionId,
                    suiteId: suite.id,
                    stepId: step.id
                });
                
                let result: BrowserTestResult;
                
                try {
                    // Execute the step
                    result = await this.executeTestStep(browserId, step, options);
                    
                    // Add result to execution
                    execution.steps.push({
                        stepId: step.id,
                        result
                    });
                    
                    // Emit step completed event
                    this.emitEvent({
                        type: BrowserTestingEventType.StepCompleted,
                        executionId,
                        suiteId: suite.id,
                        stepId: step.id,
                        data: result
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    
                    // Create failure result
                    result = {
                        success: false,
                        stepId: step.id,
                        error: errorMessage,
                        timestamp: Date.now()
                    };
                    
                    // Add failure to execution
                    execution.steps.push({
                        stepId: step.id,
                        result
                    });
                    
                    // Emit step failure event
                    this.emitEvent({
                        type: BrowserTestingEventType.StepFailed,
                        executionId,
                        suiteId: suite.id,
                        stepId: step.id,
                        error: errorMessage,
                        data: result
                    });
                    
                    // Stop execution on failure
                    execution.success = false;
                    execution.error = `Failed at step: ${step.name}. Error: ${errorMessage}`;
                    break;
                }
                
                // If step requested screenshot
                if (step.screenshot || options.recordScreenshots) {
                    await this.captureScreenshot(browserId, executionId, step.id);
                }
                
                // If step has wait for navigation, wait for page to load
                if (step.waitForNavigation || (step.action === BrowserActionType.Navigate && options.waitForPageLoad)) {
                    await this.browserService.executeAction(browserId, {
                        type: BrowserActionType.WaitForNavigation,
                        timeout: options.timeout
                    });
                }
                
                // If step has wait for selector, wait for element
                if (step.waitForSelector) {
                    await this.browserService.executeAction(browserId, {
                        type: BrowserActionType.WaitForSelector,
                        selector: step.waitForSelector,
                        timeout: options.timeout
                    });
                }
            }
            
            // Mark test as successful if we got through all steps
            if (execution.success === undefined) {
                execution.success = true;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            // Mark test as failed
            execution.success = false;
            execution.error = errorMessage;
            
            // Emit test failure event
            this.emitEvent({
                type: BrowserTestingEventType.TestFailed,
                executionId,
                suiteId: suite.id,
                error: errorMessage
            });
        } finally {
            // Capture final screenshot
            if (options.recordScreenshots) {
                await this.captureScreenshot(browserId, executionId);
            }
            
            // Close browser session
            await this.browserService.closeSession(browserId);
            
            // Complete execution
            execution.endTime = Date.now();
            
            // Update suite with last run info
            suite.lastRun = Date.now();
            suite.lastResult = {
                success: execution.success || false,
                failedStep: execution.success ? undefined : 
                    execution.steps.find(s => !s.result.success)?.stepId,
                error: execution.error
            };
            
            await this.saveTestSuite(suite);
            await this.saveTestExecution(execution);
            
            // Remove from active executions
            this.activeExecutions.delete(executionId);
            
            // Emit test completed event
            this.emitEvent({
                type: BrowserTestingEventType.TestCompleted,
                executionId,
                suiteId: suite.id,
                data: {
                    success: execution.success,
                    duration: execution.endTime - execution.startTime
                }
            });
        }
    }
    
    private async executeTestStep(
        browserId: string,
        step: BrowserTestStep,
        _options: BrowserTestingOptions
    ): Promise<BrowserTestResult> {
        const result = await this.browserService.executeAction(browserId, {
            type: step.action,
            ...step.parameters
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Step execution failed');
        }
        
        // For element interaction steps, map parameters to the right format
        if (step.action === BrowserActionType.ElementInteraction && step.parameters) {
            const interaction = step.parameters as ElementInteraction;
            
            // Execute the element interaction
            const interactionResult = await this.browserService.executeAction(browserId, {
                type: BrowserActionType.ElementInteraction,
                interaction
            });
            
            if (!interactionResult.success) {
                throw new Error(interactionResult.error || 'Element interaction failed');
            }
        }
        
        return {
            success: true,
            stepId: step.id,
            timestamp: Date.now(),
            ...result
        };
    }
    
    private async captureScreenshot(
        browserId: string,
        executionId: string,
        stepId?: string
    ): Promise<string | undefined> {
        try {
            const result = await this.browserService.executeAction(browserId, {
                type: BrowserActionType.CaptureScreenshot
            });
            
            if (result.success && result.screenshot) {
                // Get the screenshot from the result
                const screenshot = result.screenshot;
                
                // Save screenshot to results folder
                const screenshotFilename = `${executionId}_${stepId || 'final'}.png`;
                const screenshotPath = path.join(this.storageDir, 'results', screenshotFilename);
                
                // Convert base64 to buffer and save
                const data = screenshot.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(data, 'base64');
                await fs.writeFile(screenshotPath, buffer);
                
                return screenshot;
            }
        } catch (error) {
            this.context.loggingService.error('Error capturing screenshot:', error);
        }
        
        return undefined;
    }
    
    private async saveTestExecution(execution: BrowserTestExecution): Promise<void> {
        try {
            const filePath = path.join(this.storageDir, 'results', `${execution.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(execution, null, 2), 'utf8');
        } catch (error) {
            this.context.loggingService.error(`Error saving test execution ${execution.id}:`, error);
        }
    }
    
    public getTestExecutionById(executionId: string): BrowserTestExecution | undefined {
        return this.testExecutions.get(executionId);
    }
    
    private emitEvent(event: Omit<BrowserTestingEvent, 'timestamp'>): void {
        this.eventEmitter.fire({
            ...event,
            timestamp: Date.now()
        });
    }
    
    public dispose(): void {
        // Close all active test executions
        for (const [executionId, data] of this.activeExecutions.entries()) {
            this.browserService.closeSession(data.browserId).catch(error => {
                this.context.loggingService.error(`Error closing browser session for execution ${executionId}:`, error);
            });
        }
        
        this.disposables.forEach(d => d.dispose());
        this.activeExecutions.clear();
        this.testExecutions.clear();
        this.testSuites.clear();
    }
} 