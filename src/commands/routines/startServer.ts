import * as vscode from 'vscode';
import { Context } from '../../helpers/context';
import { UnrealEngineProject } from '../../types';
import * as path from 'path';

export const StartServerCommands = (): Promise<boolean> => {
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

            // bat file path
            const batFilePath = path.join(projectFolder, "./../server/exe/start_allserver_d_min.bat");

            // use powershell to run the bat file in the path of the bat file
            let shellCommand = new vscode.ShellExecution(
                `powershell -Command "Start-Process -FilePath "${batFilePath}" -WorkingDirectory "${path.dirname(batFilePath)}" -Verb RunAs"`
            );

            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                'Start Server',
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
                    vscode.window.showInformationMessage(`Server started`);
                    console.log('End: startServer');
                    resolve(true);
                }
            }); 
        })();
    });
};