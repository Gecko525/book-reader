import * as vscode from 'vscode';
import * as path from 'path';
import { FileExplorer } from './fileExplorer';
import ImportProvider from './importProvider';
import { _ } from './fileExplorer';

export async function activate(context: vscode.ExtensionContext) {
	try {
		const booksPath = path.join(context.globalStorageUri.fsPath, 'books');
		new FileExplorer(context, booksPath);
		new ImportProvider(context);
	} catch (error: any) {
		vscode.window.showErrorMessage(error.message);
	}
}

// "viewsContainers": {
// 	"activitybar": [
// 		{
// 			"id": "book-reader",
// 			"title": "终端阅读器",
// 			"icon": "media/book.svg"
// 		}
// 	]
// },
// "views": {
// 	"book-reader": [
// 		{
// 			"id": "bookReader.menusView",
// 			"name": "终端阅读器",
// 			"icon": "media/book.svg",
// 			"contextualTitle": "终端阅读器",
// 			"when": "!bookReader.isEmpty"
// 		}
// 	]
// },