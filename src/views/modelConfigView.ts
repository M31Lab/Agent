import * as vscode from 'vscode';

export class ModelConfigViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'm31-agent.modelConfigView';
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _modelData: ModelData[] = [];
  
  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this.initializeModelData();
    
    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('m31-agent.modelId') || 
          e.affectsConfiguration('m31-agent.apiKey')) {
        this.refreshModelConfig();
      }
    });
  }
  
  private initializeModelData(): void {
    // Populate model data with available models
    this._modelData = [
      {
        id: 'openai/gpt-4o',
        provider: 'OpenAI',
        name: 'GPT-4o',
        capabilities: ['Chat', 'Code generation', 'Code explanation', 'Reasoning'],
        description: 'OpenAI\'s most capable multimodal model for a wide range of tasks.',
        contextSize: 128000,
        costPer1kTokens: '$0.01',
        recommended: true
      },
      {
        id: 'anthropic/claude-3-opus',
        provider: 'Anthropic',
        name: 'Claude 3 Opus',
        capabilities: ['Chat', 'Code generation', 'Code explanation', 'Reasoning'],
        description: 'Anthropic\'s most powerful model for complex reasoning and knowledge tasks.',
        contextSize: 200000,
        costPer1kTokens: '$0.015',
        recommended: true
      },
      {
        id: 'anthropic/claude-3-sonnet',
        provider: 'Anthropic',
        name: 'Claude 3 Sonnet',
        capabilities: ['Chat', 'Code generation', 'Code explanation'],
        description: 'Balanced model offering strong performance at a more affordable price.',
        contextSize: 180000,
        costPer1kTokens: '$0.003',
        recommended: true
      },
      {
        id: 'anthropic/claude-3-haiku',
        provider: 'Anthropic',
        name: 'Claude 3 Haiku',
        capabilities: ['Chat', 'Code explanation'],
        description: 'Fast, compact model for responsive interactions and simpler tasks.',
        contextSize: 150000,
        costPer1kTokens: '$0.00025',
        recommended: false
      },
      {
        id: 'openai/gpt-3.5-turbo',
        provider: 'OpenAI',
        name: 'GPT-3.5 Turbo',
        capabilities: ['Chat', 'Simple code tasks'],
        description: 'Fast and cost-effective model for simpler tasks and interactions.',
        contextSize: 16000,
        costPer1kTokens: '$0.0005',
        recommended: false
      },
      {
        id: 'google/gemini-1.5-pro',
        provider: 'Google',
        name: 'Gemini 1.5 Pro',
        capabilities: ['Chat', 'Code generation', 'Code explanation', 'Reasoning'],
        description: 'Google\'s advanced model with strong reasoning and coding capabilities.',
        contextSize: 1000000,
        costPer1kTokens: '$0.0025',
        recommended: true
      },
      {
        id: 'meta/llama-3-70b-instruct',
        provider: 'Meta',
        name: 'Llama 3 70B',
        capabilities: ['Chat', 'Code generation', 'Code explanation'],
        description: 'Meta\'s state-of-the-art open weights model with strong overall performance.',
        contextSize: 8000,
        costPer1kTokens: '$0.0009',
        recommended: false
      },
      {
        id: 'mistral/mistral-large',
        provider: 'Mistral',
        name: 'Mistral Large',
        capabilities: ['Chat', 'Code generation', 'Reasoning'],
        description: 'Mistral\'s most powerful model with strong reasoning and coding skills.',
        contextSize: 32000,
        costPer1kTokens: '$0.002',
        recommended: false
      }
    ];
  }
  
  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'selectModel':
          this.selectModel(message.modelId);
          break;
        case 'configureApiKey':
          this.configureApiKey();
          break;
        case 'clearApiKey':
          this.clearApiKey();
          break;
        case 'updateSettings':
          this.updateSettings(message.settings);
          break;
        case 'refreshConfig':
          this.refreshModelConfig();
          break;
      }
    });
    
    // Initial refresh
    this.refreshModelConfig();
  }
  
  private async selectModel(modelId: string): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('m31-agent');
      await config.update('modelId', modelId, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(`Model set to ${modelId}`);
      this.refreshModelConfig();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async configureApiKey(): Promise<void> {
    try {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your OpenRouter API key',
        password: true,
        ignoreFocusOut: true
      });
      
      if (apiKey) {
        const config = vscode.workspace.getConfiguration('m31-agent');
        await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('API key configured successfully');
        this.refreshModelConfig();
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async clearApiKey(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('m31-agent');
      await config.update('apiKey', '', vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('API key cleared successfully');
      this.refreshModelConfig();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to clear API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async updateSettings(settings: {[key: string]: any}): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('m31-agent');
      
      for (const [key, value] of Object.entries(settings)) {
        await config.update(key, value, vscode.ConfigurationTarget.Global);
      }
      
      vscode.window.showInformationMessage('Settings updated successfully');
      this.refreshModelConfig();
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async refreshModelConfig(): Promise<void> {
    if (!this._view) {
      return;
    }
    
    try {
      const config = vscode.workspace.getConfiguration('m31-agent');
      const currentModelId = config.get<string>('modelId', 'openai/gpt-4o');
      const hasApiKey = config.get<string>('apiKey', '') !== '';
      const temperature = config.get<number>('temperature', 0.7);
      const maxTokens = config.get<number>('maxTokens', 2000);
      const streamResponse = config.get<boolean>('streamResponse', true);
      
      this._view.webview.postMessage({
        command: 'updateConfig',
        data: {
          currentModelId,
          hasApiKey,
          models: this._modelData,
          settings: {
            temperature,
            maxTokens,
            streamResponse
          }
        }
      });
    } catch (error) {
      this._view?.webview.postMessage({
        command: 'showError',
        message: `Failed to refresh config: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Model Configuration</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
          }
          
          .header {
            padding: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
          }
          
          .header h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 500;
          }
          
          .api-status {
            display: flex;
            align-items: center;
            font-size: 12px;
            gap: 8px;
          }
          
          .api-status.configured {
            color: var(--vscode-notificationsSuccessForeground);
          }
          
          .api-status.not-configured {
            color: var(--vscode-errorForeground);
          }
          
          .api-status-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;
          }
          
          .api-status-indicator.green {
            background-color: var(--vscode-notificationsSuccessForeground);
          }
          
          .api-status-indicator.red {
            background-color: var(--vscode-errorForeground);
          }
          
          .tabs {
            display: flex;
            background-color: var(--vscode-tab-inactiveBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
          }
          
          .tab {
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            border: none;
            background: none;
            color: var(--vscode-tab-inactiveForeground);
          }
          
          .tab.active {
            background-color: var(--vscode-tab-activeBackground);
            color: var(--vscode-tab-activeForeground);
            border-bottom: 2px solid var(--vscode-tab-activeBorderTop);
          }
          
          .tab-content {
            display: none;
            padding: 16px;
            overflow: auto;
          }
          
          .tab-content.active {
            display: block;
          }
          
          .model-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
          }
          
          .model-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 6px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            position: relative;
            transition: transform 0.2s, box-shadow 0.2s;
            cursor: pointer;
          }
          
          .model-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }
          
          .model-card.selected {
            background-color: var(--vscode-editor-selectionBackground);
            border: 1px solid var(--vscode-focusBorder);
          }
          
          .model-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          
          .model-provider {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 4px;
          }
          
          .model-name {
            font-size: 16px;
            font-weight: 500;
            margin: 0;
          }
          
          .model-description {
            font-size: 12px;
            margin: 8px 0;
            color: var(--vscode-foreground);
            flex-grow: 1;
          }
          
          .model-capabilities {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin: 8px 0;
          }
          
          .capability-tag {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }
          
          .model-details {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
          }
          
          .recommended-badge {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: var(--vscode-notificationsInfoBackground);
            color: var(--vscode-notificationsInfoForeground);
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: 500;
            margin: 24px 0 16px 0;
          }
          
          .api-buttons {
            display: flex;
            gap: 8px;
            margin: 16px 0;
          }
          
          .settings-form {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          
          .form-label {
            font-size: 12px;
            color: var(--vscode-foreground);
          }
          
          .form-input {
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
          }
          
          .form-description {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
          }
          
          .form-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .checkbox-label {
            font-size: 12px;
          }
          
          .slider-container {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .slider {
            flex-grow: 1;
            height: 4px;
            appearance: none;
            background: var(--vscode-scrollbarSlider-background);
            outline: none;
            border-radius: 2px;
          }
          
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--vscode-focusBorder);
            cursor: pointer;
          }
          
          .slider-value {
            font-size: 12px;
            width: 30px;
            text-align: right;
          }
          
          .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
          }
          
          .button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }
          
          .button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
          }
          
          .error-text {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 8px;
            margin: 16px 0;
            border-radius: 4px;
            font-size: 12px;
            display: none;
          }
          
          .error-text.active {
            display: block;
          }
          
          .info-message {
            margin-top: 16px;
            font-size: 12px;
            font-style: italic;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>AI Model Configuration</h2>
          <div id="api-status" class="api-status not-configured">
            <span class="api-status-indicator red"></span>
            <span>API key not configured</span>
          </div>
        </div>
        
        <div class="tabs">
          <button class="tab active" data-tab="models">Models</button>
          <button class="tab" data-tab="settings">Settings</button>
          <button class="tab" data-tab="api">API Configuration</button>
        </div>
        
        <div class="tab-content active" id="models-tab">
          <div class="model-grid" id="model-grid"></div>
          
          <div class="info-message">
            Click on a model card to select it as your default AI provider.
          </div>
        </div>
        
        <div class="tab-content" id="settings-tab">
          <div class="settings-form">
            <div class="form-group">
              <div class="form-label">Temperature</div>
              <div class="slider-container">
                <input type="range" id="temperature-slider" class="slider" min="0" max="1" step="0.1" value="0.7">
                <span class="slider-value" id="temperature-value">0.7</span>
              </div>
              <div class="form-description">
                Controls randomness. Lower values are more deterministic, higher values are more creative.
              </div>
            </div>
            
            <div class="form-group">
              <div class="form-label">Max Tokens</div>
              <input type="number" id="max-tokens-input" class="form-input" value="2000" min="1" max="16000">
              <div class="form-description">
                Maximum number of tokens to generate in each response.
              </div>
            </div>
            
            <div class="form-group">
              <div class="form-checkbox">
                <input type="checkbox" id="stream-checkbox" checked>
                <span class="checkbox-label">Stream Responses</span>
              </div>
              <div class="form-description">
                When enabled, the AI responds in real-time as tokens are generated.
              </div>
            </div>
            
            <button class="button" id="save-settings-button">Save Settings</button>
          </div>
        </div>
        
        <div class="tab-content" id="api-tab">
          <div class="section-title">API Configuration</div>
          <p>
            M31 Agent requires an OpenRouter API key to access AI models. Your API key is securely stored in VS Code's secrets storage.
          </p>
          
          <div class="api-buttons">
            <button class="button" id="configure-api-button">Configure API Key</button>
            <button class="button secondary" id="clear-api-button">Clear API Key</button>
          </div>
          
          <div class="info-message">
            Get your API key from <a href="https://openrouter.ai/keys" target="_blank">OpenRouter.ai</a>
          </div>
        </div>
        
        <div class="error-text" id="error-message"></div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          // Elements
          const tabs = document.querySelectorAll('.tab');
          const tabContents = document.querySelectorAll('.tab-content');
          const modelGrid = document.getElementById('model-grid');
          const apiStatus = document.getElementById('api-status');
          const configureApiButton = document.getElementById('configure-api-button');
          const clearApiButton = document.getElementById('clear-api-button');
          const errorMessageElement = document.getElementById('error-message');
          const temperatureSlider = document.getElementById('temperature-slider');
          const temperatureValue = document.getElementById('temperature-value');
          const maxTokensInput = document.getElementById('max-tokens-input');
          const streamCheckbox = document.getElementById('stream-checkbox');
          const saveSettingsButton = document.getElementById('save-settings-button');
          
          // Current state
          let currentModelId = '';
          let hasApiKey = false;
          
          // Tab switching
          tabs.forEach(tab => {
            tab.addEventListener('click', () => {
              tabs.forEach(t => t.classList.remove('active'));
              tabContents.forEach(c => c.classList.remove('active'));
              
              tab.classList.add('active');
              const tabId = \`\${tab.getAttribute('data-tab')}-tab\`;
              document.getElementById(tabId).classList.add('active');
            });
          });
          
          // Settings sliders
          temperatureSlider.addEventListener('input', () => {
            temperatureValue.textContent = temperatureSlider.value;
          });
          
          // Save settings button
          saveSettingsButton.addEventListener('click', () => {
            const settings = {
              temperature: parseFloat(temperatureSlider.value),
              maxTokens: parseInt(maxTokensInput.value, 10),
              streamResponse: streamCheckbox.checked
            };
            
            vscode.postMessage({
              command: 'updateSettings',
              settings
            });
          });
          
          // Configure API Key button
          configureApiButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'configureApiKey'
            });
          });
          
          // Clear API Key button
          clearApiButton.addEventListener('click', () => {
            vscode.postMessage({
              command: 'clearApiKey'
            });
          });
          
          // Generate model cards
          function generateModelCards(models, selectedModelId) {
            modelGrid.innerHTML = '';
            
            models.forEach(model => {
              const isSelected = model.id === selectedModelId;
              
              const modelCard = document.createElement('div');
              modelCard.className = \`model-card \${isSelected ? 'selected' : ''}\`;
              modelCard.dataset.modelId = model.id;
              
              const modelHeader = document.createElement('div');
              modelHeader.className = 'model-header';
              
              const modelInfo = document.createElement('div');
              
              const providerElement = document.createElement('div');
              providerElement.className = 'model-provider';
              providerElement.textContent = model.provider;
              
              const nameElement = document.createElement('h3');
              nameElement.className = 'model-name';
              nameElement.textContent = model.name;
              
              modelInfo.appendChild(providerElement);
              modelInfo.appendChild(nameElement);
              
              modelHeader.appendChild(modelInfo);
              
              if (model.recommended) {
                const recommendedBadge = document.createElement('div');
                recommendedBadge.className = 'recommended-badge';
                recommendedBadge.textContent = 'Recommended';
                modelCard.appendChild(recommendedBadge);
              }
              
              const descriptionElement = document.createElement('div');
              descriptionElement.className = 'model-description';
              descriptionElement.textContent = model.description;
              
              const capabilitiesContainer = document.createElement('div');
              capabilitiesContainer.className = 'model-capabilities';
              
              model.capabilities.forEach(capability => {
                const capabilityTag = document.createElement('span');
                capabilityTag.className = 'capability-tag';
                capabilityTag.textContent = capability;
                capabilitiesContainer.appendChild(capabilityTag);
              });
              
              const detailsElement = document.createElement('div');
              detailsElement.className = 'model-details';
              
              const contextSizeElement = document.createElement('span');
              contextSizeElement.textContent = \`Context: \${(model.contextSize / 1000).toFixed(0)}K tokens\`;
              
              const costElement = document.createElement('span');
              costElement.textContent = \`Cost: \${model.costPer1kTokens}/1K tokens\`;
              
              detailsElement.appendChild(contextSizeElement);
              detailsElement.appendChild(costElement);
              
              modelCard.appendChild(modelHeader);
              modelCard.appendChild(descriptionElement);
              modelCard.appendChild(capabilitiesContainer);
              modelCard.appendChild(detailsElement);
              
              modelCard.addEventListener('click', () => {
                vscode.postMessage({
                  command: 'selectModel',
                  modelId: model.id
                });
              });
              
              modelGrid.appendChild(modelCard);
            });
          }
          
          // Update API status
          function updateApiStatus(configured) {
            if (configured) {
              apiStatus.className = 'api-status configured';
              apiStatus.innerHTML = \`
                <span class="api-status-indicator green"></span>
                <span>API key configured</span>
              \`;
            } else {
              apiStatus.className = 'api-status not-configured';
              apiStatus.innerHTML = \`
                <span class="api-status-indicator red"></span>
                <span>API key not configured</span>
              \`;
            }
          }
          
          // Handle messages from extension
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'updateConfig':
                const { currentModelId, hasApiKey, models, settings } = message.data;
                
                // Update model grid
                generateModelCards(models, currentModelId);
                
                // Update API status
                updateApiStatus(hasApiKey);
                
                // Update settings
                temperatureSlider.value = settings.temperature;
                temperatureValue.textContent = settings.temperature;
                maxTokensInput.value = settings.maxTokens;
                streamCheckbox.checked = settings.streamResponse;
                break;
                
              case 'showError':
                errorMessageElement.textContent = message.message;
                errorMessageElement.classList.add('active');
                setTimeout(() => {
                  errorMessageElement.classList.remove('active');
                }, 5000);
                break;
            }
          });
          
          // Request initial data
          vscode.postMessage({
            command: 'refreshConfig'
          });
        </script>
      </body>
      </html>`;
  }
}

interface ModelData {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
  description: string;
  contextSize: number;
  costPer1kTokens: string;
  recommended: boolean;
} 