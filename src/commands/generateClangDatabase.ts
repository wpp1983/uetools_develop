import * as vscode from 'vscode';
import * as path from 'path';
import { Context } from '../helpers/context';
import { validateProjectContext, ProjectContext } from '../helpers/context';

export async function generateClangDatabase(context: ProjectContext): Promise<void> {
    const uprojectPath = path.join(context.projectPath, `${context.projectName}.uproject`);
    
    // 创建任务来生成 Clang 数据库
    const os = process.platform;
    const scapeSpace = os === "win32" ? '` ' : '\\ ';
    let buildOsType = "";
    let shellCommand;
    
    if (os === "win32") {
        buildOsType = "Win64";
        shellCommand = new vscode.ShellExecution(
            `"${context.unrealBuildToolPath}" -Mode=GenerateClangDatabase -Project="${uprojectPath}" ${context.projectName}Editor ${buildOsType} Development -game -engine`,
            { cwd: context.unrealEngineInstallation, executable: context.runtimePath }
        );
    }

    console.log(shellCommand);

    const task = new vscode.Task(
        { type: 'shell' },
        vscode.workspace.workspaceFolders![0],
        'Generate Clang Database',
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

    // 执行任务
    await vscode.tasks.executeTask(task);

    vscode.window.showInformationMessage('Clang database generated successfully!');
} 