import * as vscode from 'vscode';
import { Context, validateProjectContext } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';

interface BuildProjectParams {
    target?: 'Editor' | 'Game';
    configuration?: 'Development' | 'Debug';
}

export const buildProject = (params: BuildProjectParams = { target: 'Editor', configuration: 'Development' }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const context = validateProjectContext();

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
                    `"${context.unrealBuildToolPath}" -mode=Build -project="${path.join(context.projectPath, context.projectName)}.uproject" ${context.projectName}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: context.unrealEngineInstallation, executable: context.runtimePath }
                );
            } else if (os === "darwin") {
                buildOsType = "Mac";
                shellCommand = new vscode.ShellExecution(
                    `${context.runtimePath.split(" ").join("\\ ")} ${context.unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -project=${path.join(context.projectPath, context.projectName).split(" ").join("\\ ")}.uproject ${context.projectName}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: context.unrealEngineInstallation }
                );
            } else if (os === "linux") {
                buildOsType = "Linux";
                shellCommand = new vscode.ShellExecution(
                    `${context.runtimePath.split(" ").join("\\ ")} ${context.unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -project=${path.join(context.projectPath, context.projectName).split(" ").join("\\ ")}.uproject ${context.projectName}${targetSuffix} ${buildOsType} ${params.configuration}`,
                    { cwd: context.unrealEngineInstallation }
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