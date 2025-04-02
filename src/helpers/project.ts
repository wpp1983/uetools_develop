import * as vscode from 'vscode';

export async function getProjectPath(): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder found');
        return undefined;
    }

    return workspaceFolders[0].uri.fsPath;
} 