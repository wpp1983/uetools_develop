import * as vscode from 'vscode';
import { Context } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';

interface PackageProjectParams {
    configuration?: 'Development' | 'Debug';
}

export const packageProject = (params: PackageProjectParams = { configuration: 'Development' }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            // check for project in the context
            const project = Context.get("project") as UnrealEngineProject;
            if (!project) {
                reject(new Error('No project found'));
                return;
            }

            // check for unreal engine installation
            const unrealEngineInstallation = Context.get("unrealEngineInstallation") as string;
            const unrealBuildToolPath = Context.get("unrealBuildToolPath") as string;
            const runtimePath = Context.get("runtimePath") as string;
            const projectFolder = Context.get("projectFolder") as string;

            // Create task to package project
            const os = process.platform;
            const scapeSpace = os === "win32" ? '` ' : '\\ '; 
            let buildOsType = "";
            let shellCommand;
            
            // TODO - Check for a better way to create shell commands for different OSes and avoid this big if/else statements
            if (os === "win32") {
                buildOsType = "Win64";
                const uatPath = path.join(unrealEngineInstallation, "Engine", "Build", "BatchFiles", "RunUAT.bat");
                shellCommand = new vscode.ShellExecution(
                    `cmd.exe /c "${uatPath}" BuildCookRun -project="${path.join(projectFolder, project.Modules[0].Name)}.uproject" -noP4 -clientconfig=${params.configuration} -cook -stage -package`,
                    { cwd: unrealEngineInstallation }
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
            if (previousTaskIndex > -1) {
                taskList.splice(previousTaskIndex, 1);
            }
            taskList.push(task);

            // Run task
            const execution = await vscode.tasks.executeTask(task);
            vscode.tasks.onDidEndTask((e) => {
                if (e.execution.task === execution.task) {
                    vscode.window.showInformationMessage(`Project ${project.Modules[0].Name} package completed`);
                    console.log('End: packageProject');
                    resolve(true);
                }
            });
        })();
    });
}; 