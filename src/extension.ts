import * as vscode from 'vscode';

import checkUnrealProject from './commands/checkUnrealProject';
import { askProjectFilesGeneration, generateProjectFiles } from './commands/generateProjectFiles';
import { detectUnrealEngineInstallation } from './commands/detectUnrealEngineInstallation';
import { generateCompileCommands } from './commands/generateCompileComands';
import { Context } from './helpers/context';
import { ActiveProjectStatusBarItem } from './StatusBarItems/ActiveProject';
import { ProjectViewController } from './components/uetools/project/controller';
import { ModulesViewController } from './components/uetools/modules/controller';
import { buildProject } from './commands/buildProject';
import { buildServer } from './commands/buildServer';
import { packageProject } from './commands/packageProject';
import { buildModule } from './commands/buildModule';
import { showPluginInExplorer } from './commands/showPluginInExplorer';
import { generateProjectFilesAndCompileCommands } from './commands/routines/generateProjectFilesAndCompileCommands';
import { checkProjectAndUnrealInstallation } from './commands/routines/checkProjectAndUnrealInstallation';
import { changeEngineVersion } from './commands/changeEngineVersion';
import { changeEngineVersionRoutine } from './commands/routines/changeEngineVersionRoutine';
import { StartServerCommands } from './commands/routines/startServer';
import { buildDataCommands } from './commands/routines/buildData';
import { launchProject } from './commands/routines/launchProject';
import { generateClangDatabase } from './commands/generateClangDatabase';
import { generateClangdConfigFile } from './commands/generateClangdConfigFile';

// command list
interface Command {
    command: string;
    callback: (...args: any[]) => any;
}

const commands: Command[] = [
    {command: 'checkUnrealProject', callback: checkUnrealProject},
    {command: 'askProjectFilesGeneration', callback: askProjectFilesGeneration},
    {command: 'detectUnrealEngineInstallation', callback: detectUnrealEngineInstallation},
    {command: 'generateProjectFiles', callback: generateProjectFiles},
    {command: 'generateCompileCommands', callback: generateCompileCommands},
    {command: 'buildProject', callback: buildProject},
    {command: 'buildServer', callback: buildServer},
    {command: 'packageProject', callback: packageProject},
    {command: 'buildModule', callback: buildModule},
    {command: 'showPluginInExplorer', callback: showPluginInExplorer},
    {command: 'generateProjectFilesAndCompileCommands', callback: generateProjectFilesAndCompileCommands},
    {command: 'checkProjectAndUnrealInstallation', callback: checkProjectAndUnrealInstallation},
    {command: 'changeEngineVersion', callback: changeEngineVersion},
    {command: 'changeEngineVersionRoutine', callback: changeEngineVersionRoutine},
    {command: 'startServer', callback: StartServerCommands},
    {command: 'buildData', callback: buildDataCommands},
    {command: 'launchProject', callback: launchProject},
    {command: 'generateClangDatabase', callback: generateClangDatabase},
    {command: 'generateClangdConfigFile', callback: generateClangdConfigFile},
];

const tasks: vscode.Task[] = [];

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

    // Register task provider
    Context.set('tasks', tasks);
    vscode.tasks.registerTaskProvider('uetools', {
        provideTasks: () => tasks,
        resolveTask: (_task: vscode.Task) => undefined,
    });

    Context.set('tasks', tasks);

    new ActiveProjectStatusBarItem();

    new ProjectViewController(context);
    new ModulesViewController(context);

    // Register commands
    commands.forEach(c => {
        context.subscriptions.push(vscode.commands.registerCommand(`uetools.${c.command}`, c.callback));
    });

    // Register status bar items
    const projectName = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(projectName);

    // check for project
    vscode.commands.executeCommand('uetools.checkProjectAndUnrealInstallation');
}

// this method is called when your extension is deactivated
export function deactivate() { }
