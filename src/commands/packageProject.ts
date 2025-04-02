import * as vscode from 'vscode';
import { Context, validateProjectContext } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';

interface PackageProjectParams {
    target: 'Game' | 'Editor';
    configuration?: 'Development' | 'Debug';
}

export const packageProject = (params: PackageProjectParams = { target: 'Game', configuration: 'Development' }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const context = validateProjectContext();

            // Create task to package project
            const os = process.platform;
            const uatPath = path.join(context.unrealEngineInstallation, 'Engine', 'Build', 'BatchFiles', os === 'win32' ? 'RunUAT.bat' : 'RunUAT.sh');
            const projectPath = path.join(context.projectPath, context.projectName);
            
            let shellCommand;
            if (os === 'win32') {
                shellCommand = new vscode.ShellExecution(
                    `"${uatPath}" BuildCookRun -project="${projectPath}.uproject" -noP4 -platform=${params.target === 'Game' ? 'Win64' : 'Windows'} -clientconfig=${params.configuration} -serverconfig=${params.configuration} -cook -allmaps -build -stage -pak -archive -archivedirectory="${projectPath}/Saved/StagedBuilds/${params.target === 'Game' ? 'Win64' : 'Windows'}"`,
                    { cwd: context.unrealEngineInstallation }
                );
            } else if (os === 'darwin') {
                shellCommand = new vscode.ShellExecution(
                    `${uatPath.split(' ').join('\\ ')} BuildCookRun -project=${projectPath.split(' ').join('\\ ')}.uproject -noP4 -platform=Mac -clientconfig=${params.configuration} -serverconfig=${params.configuration} -cook -allmaps -build -stage -pak -archive -archivedirectory=${path.join(projectPath, 'Saved', 'StagedBuilds', 'Mac').split(' ').join('\\ ')}`,
                    { cwd: context.unrealEngineInstallation }
                );
            } else if (os === 'linux') {
                shellCommand = new vscode.ShellExecution(
                    `${uatPath.split(' ').join('\\ ')} BuildCookRun -project=${projectPath.split(' ').join('\\ ')}.uproject -noP4 -platform=Linux -clientconfig=${params.configuration} -serverconfig=${params.configuration} -cook -allmaps -build -stage -pak -archive -archivedirectory=${path.join(projectPath, 'Saved', 'StagedBuilds', 'Linux').split(' ').join('\\ ')}`,
                    { cwd: context.unrealEngineInstallation }
                );
            }

            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                'Package Project',
                'UETools',
                shellCommand,
            );

            const taskList = Context.get("tasks") as vscode.Task[];
            const previousTaskIndex = taskList.findIndex((t) => t.name === task.name);
            if (previousTaskIndex !== -1) {
                taskList[previousTaskIndex] = task;
            } else {
                taskList.push(task);
            }

            // Run task
            vscode.tasks.executeTask(task);
            resolve(true);
        } catch (error) {
            reject(error);
        }
    });
}; 