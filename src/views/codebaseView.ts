import * as vscode from 'vscode';

export class CodebaseViewProvider implements vscode.TreeDataProvider<FileItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FileItem | undefined | null | void> = new vscode.EventEmitter<FileItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FileItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor() {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FileItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: FileItem): Promise<FileItem[]> {
    if (!element) {
      // Root level - return workspace folders
      if (vscode.workspace.workspaceFolders?.length) {
        return vscode.workspace.workspaceFolders.map(
          folder => new FileItem(
            folder.name,
            folder.uri,
            vscode.FileType.Directory,
            vscode.TreeItemCollapsibleState.Collapsed
          )
        );
      }
      return [];
    }

    // Child items - return contents of the directory
    if (element.fileType === vscode.FileType.Directory) {
      try {
        const children = await vscode.workspace.fs.readDirectory(element.resourceUri);
        return children
          .sort((a, b) => {
            // Sort directories first, then files
            if ((a[1] & vscode.FileType.Directory) && !(b[1] & vscode.FileType.Directory)) {
              return -1;
            }
            if (!(a[1] & vscode.FileType.Directory) && (b[1] & vscode.FileType.Directory)) {
              return 1;
            }
            return a[0].localeCompare(b[0]);
          })
          .map(([name, type]) => {
            const collapsibleState = 
              type & vscode.FileType.Directory 
                ? vscode.TreeItemCollapsibleState.Collapsed
                : vscode.TreeItemCollapsibleState.None;
            
            const uri = vscode.Uri.joinPath(element.resourceUri, name);
            return new FileItem(name, uri, type, collapsibleState);
          });
      } catch (err) {
        console.error(err);
        return [];
      }
    }
    
    return [];
  }
}

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly fileType: vscode.FileType,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    
    this.tooltip = resourceUri.fsPath;
    
    if (fileType === vscode.FileType.File) {
      this.command = {
        command: 'vscode.open',
        arguments: [resourceUri],
        title: 'Open File'
      };
      
      // Set icon based on file extension
      const fileExtension = label.split('.').pop()?.toLowerCase();
      this.iconPath = this.getFileIconPath(fileExtension);
    } else {
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
  
  private getFileIconPath(extension?: string): vscode.ThemeIcon {
    // Set icon based on common file types
    switch (extension) {
      case 'js':
        return new vscode.ThemeIcon('javascript');
      case 'ts':
        return new vscode.ThemeIcon('typescript');
      case 'json':
        return new vscode.ThemeIcon('json');
      case 'md':
        return new vscode.ThemeIcon('markdown');
      case 'html':
        return new vscode.ThemeIcon('html');
      case 'css':
        return new vscode.ThemeIcon('css');
      case 'py':
        return new vscode.ThemeIcon('python');
      case 'java':
        return new vscode.ThemeIcon('java');
      case 'c':
      case 'cpp':
      case 'h':
        return new vscode.ThemeIcon('cpp');
      case 'go':
        return new vscode.ThemeIcon('go');
      case 'rs':
        return new vscode.ThemeIcon('rust');
      default:
        return new vscode.ThemeIcon('file');
    }
  }
} 