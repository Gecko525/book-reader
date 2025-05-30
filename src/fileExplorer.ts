import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as rimraf from 'rimraf';

// const fs = vscode.workspace.fs;
//#region Utilities

export namespace _ {
	function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
		if (error) {
			reject(massageError(error));
		} else {
			resolve(result);
		}
	}

	function massageError(error: Error & { code?: string }): Error {
		if (error.code === 'ENOENT') {
			return vscode.FileSystemError.FileNotFound();
		}

		if (error.code === 'EISDIR') {
			return vscode.FileSystemError.FileIsADirectory();
		}

		if (error.code === 'EEXIST') {
			return vscode.FileSystemError.FileExists();
		}

		if (error.code === 'EPERM' || error.code === 'EACCES') {
			return vscode.FileSystemError.NoPermissions();
		}

		return error;
	}

	export function checkCancellation(token: vscode.CancellationToken): void {
		if (token.isCancellationRequested) {
			throw new Error('Operation cancelled');
		}
	}

	export function normalizeNFC(items: string): string;
	export function normalizeNFC(items: string[]): string[];
	export function normalizeNFC(items: string | string[]): string | string[] {
		if (process.platform !== 'darwin') {
			return items;
		}

		if (Array.isArray(items)) {
			return items.map(item => item.normalize('NFC'));
		}

		return items.normalize('NFC');
	}

	export function readdir(path: string): Promise<string[]> {
		return new Promise<string[]>((resolve, reject) => {
			fs.readdir(path, (error, children) => handleResult(resolve, reject, error, normalizeNFC(children)));
		});
	}

	export function stat(path: string): Promise<fs.Stats> {
		return new Promise<fs.Stats>((resolve, reject) => {
			fs.stat(path, (error, stat) => handleResult(resolve, reject, error, stat));
		});
	}

	export function readfile(path: string): Promise<Buffer> {
		return new Promise<Buffer>((resolve, reject) => {
			fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
		});
	}

	export function writefile(path: string, content: Buffer): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function exists(path: string): Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
			fs.exists(path, exists => handleResult(resolve, reject, null, exists));
		});
	}

	export function rmrf(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			rimraf(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function mkdir(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			mkdirp(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function rename(oldPath: string, newPath: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.rename(oldPath, newPath, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function unlink(path: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
		});
	}

	export function copy(source: string, dest: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			fs.copyFile(source, dest, (error) => handleResult(resolve, reject, error, void 0));
		})
	}
}

export class FileStat implements vscode.FileStat {

	constructor(private fsStat: fs.Stats) { }

	get type(): vscode.FileType {
		return this.fsStat.isFile() ? vscode.FileType.File : this.fsStat.isDirectory() ? vscode.FileType.Directory : this.fsStat.isSymbolicLink() ? vscode.FileType.SymbolicLink : vscode.FileType.Unknown;
	}

	get isFile(): boolean | undefined {
		return this.fsStat.isFile();
	}

	get isDirectory(): boolean | undefined {
		return this.fsStat.isDirectory();
	}

	get isSymbolicLink(): boolean | undefined {
		return this.fsStat.isSymbolicLink();
	}

	get size(): number {
		return this.fsStat.size;
	}

	get ctime(): number {
		return this.fsStat.ctime.getTime();
	}

	get mtime(): number {
		return this.fsStat.mtime.getTime();
	}
}

interface Entry {
	uri: vscode.Uri;
	type: vscode.FileType;
	siblings: [string, vscode.FileType][];
	pname: string;
	name: string;
}

//#endregion

export class FileSystemProvider implements vscode.TreeDataProvider<Entry>, vscode.FileSystemProvider {

	private _onDidChangeFile: vscode.EventEmitter<vscode.FileChangeEvent[]>;
	private _onDidChangeTreeData: vscode.EventEmitter<Entry | undefined | null | void> = new vscode.EventEmitter<Entry | undefined | null | void>();;

	constructor(private rootPath: string) {
		this._onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	watch(uri: vscode.Uri, options: { readonly recursive: boolean; readonly excludes: readonly string[]; }): vscode.Disposable {
		throw new Error('Method not implemented.');
	}
	copy?(source: vscode.Uri, destination: vscode.Uri, options: { readonly overwrite: boolean; }): void | Thenable<void> {
		throw new Error('Method not implemented.');
	}
	onDidChangeTreeData?: vscode.Event<void | Entry | Entry[] | null | undefined> | undefined = this._onDidChangeTreeData.event;
	getParent?(element: Entry): vscode.ProviderResult<Entry> {
		throw new Error('Method not implemented.');
	}
	resolveTreeItem?(item: vscode.TreeItem, element: Entry, token: vscode.CancellationToken): vscode.ProviderResult<vscode.TreeItem> {
		throw new Error('Method not implemented.');
	}

	get onDidChangeFile(): vscode.Event<vscode.FileChangeEvent[]> {
		return this._onDidChangeFile.event;
	}

	// watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }): vscode.Disposable {
	// 	const watcher = fs.watch(uri.fsPath, { recursive: options.recursive }, async (event, filename) => {
	// 		if (filename) {
	// 			const filepath = path.join(uri.fsPath, _.normalizeNFC(filename.toString()));

	// 			// TODO support excludes (using minimatch library?)

	// 			this._onDidChangeFile.fire([{
	// 				type: event === 'change' ? vscode.FileChangeType.Changed : await _.exists(filepath) ? vscode.FileChangeType.Created : vscode.FileChangeType.Deleted,
	// 				uri: uri.with({ path: filepath })
	// 			} as vscode.FileChangeEvent]);
	// 		}
	// 	});

	// 	return { dispose: () => watcher.close() };
	// }

	stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
		return this._stat(uri.fsPath);
	}

	async _stat(path: string): Promise<vscode.FileStat> {
		return new FileStat(await _.stat(path));
	}

	readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
		return this._readDirectory(uri);
	}

	async _readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		const children = await _.readdir(uri.fsPath);

		const result: [string, vscode.FileType][] = [];
		for (const child of children) {
			const stat = await this._stat(path.join(uri.fsPath, child));
			result.push([child, stat.type]);
		}

		return Promise.resolve(result);
	}

	createDirectory(uri: vscode.Uri): void | Thenable<void> {
		return _.mkdir(uri.fsPath);
	}

	readFile(uri: vscode.Uri): Uint8Array | Thenable<Uint8Array> {
		return _.readfile(uri.fsPath);
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
		return this._writeFile(uri, content, options);
	}

	async _writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(uri.fsPath);
		if (!exists) {
			if (!options.create) {
				throw vscode.FileSystemError.FileNotFound();
			}

			await _.mkdir(path.dirname(uri.fsPath));
		} else {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			}
		}

		return _.writefile(uri.fsPath, content as Buffer);
	}

	delete(uri: vscode.Uri, options: { recursive: boolean; }): void | Thenable<void> {
		if (options.recursive) {
			return _.rmrf(uri.fsPath);
		}

		return _.unlink(uri.fsPath);
	}

	rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): void | Thenable<void> {
		return this._rename(oldUri, newUri, options);
	}

	async _rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }): Promise<void> {
		const exists = await _.exists(newUri.fsPath);
		if (exists) {
			if (!options.overwrite) {
				throw vscode.FileSystemError.FileExists();
			} else {
				await _.rmrf(newUri.fsPath);
			}
		}

		const parentExists = await _.exists(path.dirname(newUri.fsPath));
		if (!parentExists) {
			await _.mkdir(path.dirname(newUri.fsPath));
		}

		return _.rename(oldUri.fsPath, newUri.fsPath);
	}

	// tree data provider

	async getChildren(element?: Entry): Promise<Entry[]> {
		if (element) {
			const children = await this.readDirectory(element.uri);
			children.sort((a, b) => {
				if (a[1] === b[1]) {
					if (isNaN(parseInt(a[0])) || isNaN(parseInt(b[0]))) {
						return a[0].localeCompare(b[0]);
					}

					return parseInt(a[0]) - parseInt(b[0]);
				}
				return a[1] === vscode.FileType.Directory ? -1 : 1;
			});
			return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(element.uri.fsPath, name)), siblings: children, pname: element.name, name, type }));
		}

		// const workspaceFolder = (vscode.workspace.workspaceFolders ?? []).filter(folder => folder.uri.scheme === 'file')[0];
		const rootFolderUri = vscode.Uri.file(path.join(this.rootPath, 'books'));
		if (rootFolderUri) {
			const children = await this.readDirectory(rootFolderUri);
			children.sort((a, b) => {
				if (a[1] === b[1]) {
					return a[0].localeCompare(b[0]);
				}
				return a[1] === vscode.FileType.Directory ? -1 : 1;
			});
			return children.map(([name, type]) => ({ uri: vscode.Uri.file(path.join(rootFolderUri.fsPath, name)), siblings: children, pname: '', name, type }));
		}

		return [];
	}

	getTreeItem(element: Entry): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.uri, element.type === vscode.FileType.Directory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
		if (element.type === vscode.FileType.File) {
			treeItem.command = { command: 'bookReader.readFile', title: "打开文件", arguments: [element], };
			treeItem.contextValue = 'file';
		}
		return treeItem;
	}
}


type CustomTerminalLink = vscode.TerminalLink & {
	pre?: vscode.Uri;
	next?: vscode.Uri;
	type?: string;
};

export class FileExplorer {
	private context: vscode.ExtensionContext;
	private terminal: vscode.Terminal | undefined;
	private terminalLinkProvider: vscode.Disposable | undefined;
	private writeEmitter: vscode.EventEmitter<string> = new vscode.EventEmitter<string>();
	constructor(context: vscode.ExtensionContext) {
		this.context = context;
		const fileSystemProvider = new FileSystemProvider(context.globalStorageUri.fsPath);
		vscode.window.registerTreeDataProvider('book-reader', fileSystemProvider);
		vscode.commands.registerCommand('bookReader.readFile', (element) => this.openResource(element));
		vscode.commands.registerCommand('bookReader.refresh', () => fileSystemProvider.refresh());
	}

	private async openResource(element: Entry): Promise<void> {
		const pty = {
			onDidWrite: this.writeEmitter.event,
			open: () => {
				this.fireContent(element);
			},
			close: () => { /* noop*/
				// 移除linkprovider
				this.terminalLinkProvider?.dispose();
			},
		};

		this.terminal?.dispose();
		this.terminal = vscode.window.createTerminal({ name: element.name, pty });
		this.terminal.show();
	}

	private async fireContent(element: Entry) {
		const context = this.context;
		const writeEmitter = this.writeEmitter;
		let preResource: vscode.Uri | undefined;
		let nextResource: vscode.Uri | undefined;
		const resource = element.uri;
		const siblings = element.siblings;
		const dir = path.dirname(resource.fsPath);
		const index = siblings.findIndex(sibling => sibling[0] === path.basename(resource.fsPath));
		if (index == 0) {
			nextResource = vscode.Uri.file(path.join(dir, siblings[index + 1][0]));
		} else if (index > 0 && index < siblings.length - 1) {
			preResource = vscode.Uri.file(path.join(dir, siblings[index - 1][0]));
			nextResource = vscode.Uri.file(path.join(dir, siblings[index + 1][0]));
		} else if (index == siblings.length - 1) {
			preResource = vscode.Uri.file(path.join(dir, siblings[index - 1][0]));
		}

		this.terminalLinkProvider?.dispose();
		context.subscriptions.push(
			this.terminalLinkProvider = this.getTerminalLinkProvider(preResource, nextResource, element)
		);
		const fileContent = await _.readfile(resource.fsPath);
		writeEmitter.fire('《' + element.pname + '》' + '\r\n\r\n');
		fileContent.toString('utf8').split(/\r?\n/).forEach(line => {
			writeEmitter.fire(line + '\r\n\r\n');
		})
		writeEmitter.fire((preResource ? '[上一章] ' : '') + (nextResource ? '[下一章]' : ''));
		// 延迟后滚动到顶部
		setTimeout(() => {
			vscode.commands.executeCommand('workbench.action.terminal.scrollToTop');
			vscode.commands.executeCommand("workbench.view.explorer");
		}, 100);
	}

	private getTerminalLinkProvider(preResource?: vscode.Uri, nextResource?: vscode.Uri, element?: Entry): vscode.Disposable {
		// 注册终端链接提供程序
		return vscode.window.registerTerminalLinkProvider({
			provideTerminalLinks: (context, token) => {
				const preRegex = /\[上一章\]/g;
				const nextRegex = /\[下一章\]/g;
				const results: CustomTerminalLink[] = [];

				if (preResource) {
					let match;
					while ((match = preRegex.exec(context.line)) !== null) {
						results.push({
							startIndex: match.index,
							length: match[0].length,
							tooltip: '打开上一章',
							type: 'pre',
							pre: vscode.Uri.file(preResource.fsPath)
						});
					}
				}

				if (nextResource) {
					let match;
					while ((match = nextRegex.exec(context.line)) !== null) {
						results.push({
							startIndex: match.index,
							length: match[0].length,
							tooltip: '打开下一章',
							type: 'next',
							next: vscode.Uri.file(nextResource.fsPath)
						});
					}
				}
				return results;
			},
			handleTerminalLink: (link: any) => {
				if (link.type === 'pre' && preResource) {
					vscode.commands.executeCommand('bookReader.readFile', { ...element, uri: link.pre, name: path.basename(preResource.fsPath) });
				}
				if (link.type === 'next' && nextResource) {
					vscode.commands.executeCommand('bookReader.readFile', { ...element, uri: link.next, name: path.basename(nextResource.fsPath) });
				}
			}
		});
	}
}


