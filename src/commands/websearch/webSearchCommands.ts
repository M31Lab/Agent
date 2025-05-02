import * as vscode from 'vscode';
import { ExtensionContext } from '../../models/context/extensionContext';
import { SearchProvider, SearchResult } from '../../services/search/webSearchService';

export function registerWebSearchCommands(context: ExtensionContext): vscode.Disposable[] {
  const disposables: vscode.Disposable[] = [];

  const searchService = context.webSearchService;

  if (!searchService) {
    context.loggingService.error('Web search service not initialized');
    return disposables;
  }

  disposables.push(
    vscode.commands.registerCommand('m31-agent.webSearch.search', async () => {
      try {
        const query = await vscode.window.showInputBox({
          prompt: 'Enter search query',
          placeHolder: 'Search the web',
        });

        if (!query) {
          return;
        }

        const results = await searchService.search(query);

        if (results.length === 0) {
          vscode.window.showInformationMessage('No search results found');
          return;
        }

        const items = results.map((result) => ({
          label: result.title,
          description: result.url,
          detail: result.description,
          result,
        }));

        const selectedItem = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a search result to open',
        });

        if (selectedItem) {
          vscode.env.openExternal(vscode.Uri.parse(selectedItem.result.url));

          // Track telemetry
          context.telemetryService.trackEvent('search_result_clicked', {
            provider: searchService.getProvider(),
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Search failed: ${errorMessage}`);
      }
    })
  );

  disposables.push(
    vscode.commands.registerCommand('m31-agent.webSearch.configure', async () => {
      try {
        const currentProvider = searchService.getProvider();

        const providerOptions = [
          { label: 'Bing', value: SearchProvider.Bing },
          { label: 'Google', value: SearchProvider.Google },
          { label: 'DuckDuckGo', value: SearchProvider.DuckDuckGo },
          { label: 'Custom', value: SearchProvider.Custom },
        ];

        const selectedProvider = await vscode.window.showQuickPick(
          providerOptions.map((option) => ({
            label: option.label,
            description: option.value === currentProvider ? '(Current)' : '',
            value: option.value,
          })),
          { placeHolder: 'Select search provider' }
        );

        if (!selectedProvider) {
          return;
        }

        if (selectedProvider.value === SearchProvider.Custom) {
          const endpoint = await vscode.window.showInputBox({
            prompt: 'Enter custom search endpoint URL',
            placeHolder: 'https://your-custom-search-api.com/search',
          });

          if (endpoint) {
            await searchService.setCustomEndpoint(endpoint);
          }
        }

        await searchService.setProvider(selectedProvider.value);

        vscode.window.showInformationMessage(`Search provider set to ${selectedProvider.label}`);

        // If provider requires API key, prompt for configuration
        if (
          selectedProvider.value === SearchProvider.Bing ||
          selectedProvider.value === SearchProvider.Google
        ) {
          const configureKey = await vscode.window.showInformationMessage(
            `${selectedProvider.label} search requires an API key. Would you like to configure it now?`,
            'Yes',
            'No'
          );

          if (configureKey === 'Yes') {
            await vscode.commands.executeCommand(
              'workbench.action.openSettings',
              `m31-agent.search.${selectedProvider.value}ApiKey`
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to configure search: ${errorMessage}`);
      }
    })
  );

  return disposables;
}

export async function performWebSearch(
  context: ExtensionContext,
  query: string
): Promise<SearchResult[]> {
  const searchService = context.webSearchService;

  if (!searchService) {
    throw new Error('Web search service not initialized');
  }

  try {
    return await searchService.search(query);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Search failed: ${errorMessage}`);
    return [];
  }
}
