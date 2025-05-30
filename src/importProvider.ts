import * as vscode from 'vscode';
import * as path from 'path';
import { _ } from './fileExplorer';

export default class ImportProvider {

  constructor(context: vscode.ExtensionContext) {
    vscode.commands.registerCommand('bookReader.importBook', async () => {
      try {
        const paths = await this.getPathsFromPicker();
        // 获取插件存储目录
        const storageUri = context.globalStorageUri;
        const booksPath = path.join(storageUri.fsPath, 'books');
        // 确保存储目录存在
        const isExists = await _.exists(booksPath);
        if (!isExists) {
          await _.mkdir(booksPath);
        }

        for (const _path of paths) {
          // 创建目标文件夹
          const targetFolderName = path.basename(_path.fsPath);
          const targetFolderPath = path.join(booksPath, targetFolderName);
          await _.mkdir(targetFolderPath);
          // 复制所有文件
          await this.copyFolderRecursive(_path.fsPath, targetFolderPath);
        }
        // 刷新树形视图
        vscode.commands.executeCommand('bookReader.refresh');
        vscode.window.showInformationMessage(`导入成功!`);
      } catch (error: any) {
        console.error(error);
        vscode.window.showErrorMessage(error.message);
      }
    });
  }

  /**
 * 递归复制文件夹
 * @param source 源路径
 * @param target 目标路径
 */
  private async copyFolderRecursive(source: string, target: string): Promise<void> {
    // 确保目标目录存在
    if (!await _.exists(target)) {
      await _.mkdir(target);
    }

    // 读取源目录中的所有文件/目录
    const files = await _.readdir(source);

    for (const file of files) {
      const sourcePath = path.join(source, file);
      const targetPath = path.join(target, file);

      const stat = await _.stat(sourcePath);

      if (stat.isDirectory()) {
        // 如果是目录，递归复制
        await this.copyFolderRecursive(sourcePath, targetPath);
      } else {
        // 如果是文件，直接复制
        await _.copy(sourcePath, targetPath);
      }
    }
  }
  private async getPathsFromPicker(): Promise<vscode.Uri[]> {
    // Path
    let selectedProjectUris = await vscode.window.showOpenDialog({
      openLabel: `选择文件夹`,
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: true,
    });

    if (selectedProjectUris == null || selectedProjectUris[0] == null) {
      throw new Error('用户取消');
    }

    return selectedProjectUris;
  }
}