import * as vscode from 'vscode';
import { Context } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';

interface BuildProjectParams {
    target?: 'Editor' | 'Game';
    configuration?: 'Development' | 'Debug';
}

export const buildProject = (params: BuildProjectParams = { target: 'Editor', configuration: 'Development' }): Promise<boolean> => {
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

            // Create task to build project
            const os = process.platform;
            const scapeSpace = os === "win32" ? '` ' : '\\ '; 
            let buildOsType = "";
            let shellCommand;
            
            // Determine target suffix
            const targetSuffix = params.target === 'Game' ? '' : 'Editor';
            
            // TODO - Check for a better way to create shell commands for different OSes and avoid this big if/else statements
            if (os === "win32") {
                buildOsType = "Win64";
                shellCommand = new vscode.ShellExecution(
                    `"${unrealBuildToolPath}" -mode=Build -project="${path.join(projectFolder, project.Modules[0].Name)}.uproject" ${project.Modules[0].Name}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: unrealEngineInstallation, executable: runtimePath }
                );
            } else if (os === "darwin") {
                buildOsType = "Mac";
                shellCommand = new vscode.ShellExecution(
                    `${runtimePath.split(" ").join("\\ ")} ${unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -project=${path.join(projectFolder, project.Modules[0].Name).split(" ").join("\\ ")}.uproject ${project.Modules[0].Name}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: unrealEngineInstallation }
                );
            } else if (os === "linux") {
                buildOsType = "Linux";
                shellCommand = new vscode.ShellExecution(
                    `${runtimePath.split(" ").join("\\ ")} ${unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -project=${path.join(projectFolder, project.Modules[0].Name).split(" ").join("\\ ")}.uproject ${project.Modules[0].Name}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: unrealEngineInstallation }
                );
            }

            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                'Build Project',
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
                    vscode.window.showInformationMessage(`Project ${project.Modules[0].Name} build completed`);
                    console.log('End: generateProjectFiles');
                    resolve(true);
                }
            });
        })();
    });
};