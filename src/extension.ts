import * as vscode from 'vscode';
import { FileExplorer } from './fileExplorer';
import ImportProvider from './importProvider';


export function activate(context: vscode.ExtensionContext) {
	new FileExplorer(context);
	new ImportProvider(context);
}
