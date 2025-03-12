import * as vscode from 'vscode';
import { Context } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';

export const buildModule = (args: { moduleName: string }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            // check for project in the context
            const project = Context.get("project") as UnrealEngineProject;
            if (!project) {
                reject(new Error('No project found'));
                return;
            }

            // check module name
            if (!args.moduleName) {
                reject(new Error('No module name found'));
                return;
            }

            // check for unreal engine installation
            let unrealEngineInstallation = Context.get("unrealEngineInstallation") as string;
            if (!unrealEngineInstallation) {
                await vscode.commands.executeCommand('uetools.detectUnrealEngineInstallation');
                unrealEngineInstallation = Context.get("unrealEngineInstallation") as string;
                if (!unrealEngineInstallation) {
                    reject(new Error('No unreal engine installation found'));
                    return;
                }
            }

            const projectFolder = Context.get("projectFolder") as string;
            const unrealBuildToolPath = Context.get("unrealBuildToolPath") as string;
            const runtimePath = Context.get("runtimePath") as string;
            const randomIntNum = Math.floor(Math.random() * 100000);

            // Create task to build project
            const os = process.platform;
            const scapeSpace = os === "win32" ? '^ ' : '\\ ';
            let buildOsType = "";
            let shellCommand;
            // TODO - Check for a better way to create shell commands for different OSes and avoid this big if/else statements
            if (os === "win32") {
                buildOsType = "Win64";
                shellCommand = new vscode.ShellExecution(
                    `"${unrealBuildToolPath}" -mode=Build -ModuleWithSuffix=${args.moduleName},${randomIntNum} -ForceHotReload -project="${path.join(projectFolder, project.Modules[0].Name)}.uproject" ${project.Modules[0].Name}Editor ${buildOsType} Development`,
                    // `dotnet ${path.join(unrealEngineInstallation, "Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.dll").replace(' ', '\\ ')} -mode=Build -ForceHotReload -project=${path.join(projectFolder, project.Modules[0].Name).replace(' ', '\\ ')}.uproject ${args.moduleName} ${project.Modules[0].Name}Editor Mac Development`,
                    { cwd: unrealEngineInstallation, executable: runtimePath }
                );
            } else if (os === "darwin") {
                buildOsType = "Mac";
                shellCommand = new vscode.ShellExecution(
                    `${runtimePath.split(" ").join("\\ ")} ${unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -ModuleWithSuffix=${args.moduleName},${randomIntNum} -ForceHotReload -project=${path.join(projectFolder, project.Modules[0].Name).split(" ").join("\\ ")}.uproject ${project.Modules[0].Name}Editor ${buildOsType} Development`,
                    { cwd: unrealEngineInstallation }
                );
            } else if (os === "linux") {
                buildOsType = "Linux";
                shellCommand = new vscode.ShellExecution(
                    `${runtimePath.split(" ").join("\\ ")} ${unrealBuildToolPath.split(" ").join("\\ ")} -mode=Build -ModuleWithSuffix=${args.moduleName},${randomIntNum} -ForceHotReload -project=${path.join(projectFolder, project.Modules[0].Name).split(" ").join("\\ ")}.uproject ${project.Modules[0].Name}Editor ${buildOsType} Development`,
                    { cwd: unrealEngineInstallation }
                );
            }

            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                `Build ${args.moduleName} Module`,
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
                    vscode.window.showInformationMessage(`Module ${args.moduleName} build completed`);
                    resolve(true);
                }
            });


        })();
    });
};