import * as vscode from 'vscode';

export class EmptyWebviewItem extends vscode.TreeItem {
  constructor(
    private message: string,
    private showButton: boolean,
  ) {
    super('', vscode.TreeItemCollapsibleState.None);

    // 使用Webview实现自定义渲染
    this.iconPath = new vscode.ThemeIcon('info');
    this.description = false;
    this.tooltip = '';
  }

  // 重写getWebview方法提供自定义HTML内容
  get webview(): string {
    const style = `
          <style>
              .empty-state-container {
                  padding: 16px;
                  text-align: center;
                  color: var(--vscode-descriptionForeground);
              }
              .empty-state-message {
                  margin-bottom: ${this.showButton ? '12px' : '0'};
                  font-size: 13px;
              }
              .empty-state-button {
                  display: inline-block;
                  padding: 4px 12px;
                  background-color: var(--vscode-button-background);
                  color: var(--vscode-button-foreground);
                  border-radius: 2px;
                  text-decoration: none;
                  font-size: 12px;
                  cursor: pointer;
              }
              .empty-state-button:hover {
                  background-color: var(--vscode-button-hoverBackground);
                  text-decoration: none;
              }
          </style>
      `;

    const button = this.showButton ? `
          <a class="empty-state-button" onclick="handleImport()">
              <i class="codicon codicon-add"></i> 导入文件
          </a>
      ` : '';

    const script = this.showButton ? `
          <script>
              const vscode = acquireVsCodeApi();
              function handleImport() {
                  vscode.postMessage({ command: 'import' });
              }
          </script>
      ` : '';

    return `
          <!DOCTYPE html>
          <html>
          <head>
              ${style}
          </head>
          <body>
              <div class="empty-state-container">
                  <div class="empty-state-message">${this.message}</div>
                  ${button}
              </div>
              ${script}
          </body>
          </html>
      `;
  }
}

export default class EmptyProvider implements vscode.WebviewViewProvider {
  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true
    };

    webviewView.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          .main {
            padding: 20px;
            texxt-align: center;
          }
          p {
            margin-top: 10px;
          }
          button {
            width: 100%;
            margin: 10px 0;
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 2px;
            cursor: pointer;
          }
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
        </style>
      </head>
      <body>
        <div class="main">
          <h1>欢迎使用终端阅读器</h1>
          <p>当前没有电子书，可批量导入电子书。</p>
          <button onclick="handleImport()">导入电子书</button>
        </div>
        <script>
          const vscode = acquireVsCodeApi();
          function handleImport() {
            vscode.postMessage({
              command: 'bookReader.importBook'
            });
          }
        </script>
      </body>
      </html>
    `;

    // 处理来自 Webview 的消息
    webviewView.webview.onDidReceiveMessage(message => {
      vscode.commands.executeCommand(message.command);
    });
  }
}

// export default class EmptyExplorer {
//   constructor(context: vscode.ExtensionContext) {
//     context.subscriptions.push(
//       vscode.window.registerWebviewViewProvider(
//         'bookReader.menusView',
//         new EmptyProvider()
//       )
//     );
//   }
// }