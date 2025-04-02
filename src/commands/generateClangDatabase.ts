import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Context } from '../helpers/context';
import { validateProjectContext, ProjectContext } from '../helpers/context';

export async function generateClangDatabase(): Promise<void> {
    const context = validateProjectContext();
    
    // 删除旧的 compile_commands.json
    const oldCompileCommandsPath = path.join(context.unrealEngineInstallation, 'compile_commands.json');
    const oldVscodePath = path.join(context.projectPath, '.vscode', 'compile_commands.json');
    
    if (fs.existsSync(oldCompileCommandsPath)) {
        fs.unlinkSync(oldCompileCommandsPath);
    }
    if (fs.existsSync(oldVscodePath)) {
        fs.unlinkSync(oldVscodePath);
    }

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

    // 执行任务并等待完成
    try {
        // 设置任务监听器
        const taskExecution = new Promise<void>((resolve, reject) => {
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution.task === task) {
                    disposable.dispose();
                    if (e.exitCode === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Task failed with exit code ${e.exitCode}`));
                    }
                }
            });
        });

        // 执行任务
        vscode.tasks.executeTask(task);
        // 等待任务完成
        await taskExecution;
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate Clang database: ${error.message}`);
        return;
    }

    // 检查 compile_commands.json 是否生成成功
    const compileCommandsPath = path.join(context.unrealEngineInstallation, 'compile_commands.json');
    const vscodeDir = path.join(context.projectPath, '.vscode');
    const targetPath = path.join(vscodeDir, 'compile_commands.json');

    // 等待一段时间确保文件生成完成
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (fs.existsSync(compileCommandsPath)) {
        // 确保 .vscode 目录存在
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // 复制文件到 .vscode 目录
        fs.copyFileSync(compileCommandsPath, targetPath);
        vscode.window.showInformationMessage('Clang database generated and copied to .vscode directory successfully!');
    } else {
        vscode.window.showErrorMessage('Failed to generate compile_commands.json!');
    }

    /*
    // 创建生成 VSCode 工程文件的任务
    const generateProjectTask = new vscode.Task(
        { type: 'shell' },
        vscode.workspace.workspaceFolders![0],
        'Generate VSCode Project Files',
        'UETools',
        new vscode.ShellExecution(
            `"${context.unrealBuildToolPath}" -mode=GenerateProjectFiles -Project="${uprojectPath}" ${context.projectName}Editor ${buildOsType} Development -vscode`,
            { cwd: context.unrealEngineInstallation, executable: context.runtimePath }
        ),
    );

    // 更新任务列表
    const previousProjectTaskIndex = taskList.findIndex((t) => t.name === generateProjectTask.name);
    if (previousProjectTaskIndex !== -1) {
        taskList[previousProjectTaskIndex] = generateProjectTask;
    } else {
        taskList.push(generateProjectTask);
    }

    // 执行生成 VSCode 工程文件的任务
    try {
        // 设置任务监听器
        const projectTaskExecution = new Promise<void>((resolve, reject) => {
            const disposable = vscode.tasks.onDidEndTaskProcess(e => {
                if (e.execution.task === generateProjectTask) {
                    disposable.dispose();
                    if (e.exitCode === 0) {
                        resolve();
                    } else {
                        reject(new Error(`Failed to generate VSCode project files with exit code ${e.exitCode}`));
                    }
                }
            });
        });

        // 执行任务
        vscode.tasks.executeTask(generateProjectTask);
        // 等待任务完成
        await projectTaskExecution;
        vscode.window.showInformationMessage('VSCode project files generated successfully!');
        
        // 重新打开当前 workspace，触发 VSCode 重新加载
        const workspaceFile = vscode.workspace.workspaceFolders![0].uri;
        await vscode.commands.executeCommand('vscode.openWorkspace', workspaceFile);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to generate VSCode project files: ${error.message}`);
    }
    */

    // 修改工程设置中的clangd内容
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders![0];
        const clangdConfig = vscode.workspace.getConfiguration('clangd');
        const clangdArgs = clangdConfig.get('arguments') as string[] || [];
        
        // 修改--compile-commands-dir 到 .vscode 目录
        const vscodeDir = path.join(context.projectPath, '.vscode');
        const clangdIndex = clangdArgs.findIndex((arg) => arg.startsWith('--compile-commands-dir'));
        if (clangdIndex !== -1) {
            clangdArgs[clangdIndex] = `--compile-commands-dir=${vscodeDir}`;
        } else {
            clangdArgs.push(`--compile-commands-dir=${vscodeDir}`);
        }

        // 修改--clang-tidy 为 false
        const clangTidyIndex = clangdArgs.findIndex((arg) => arg.startsWith('--clang-tidy'));
        if (clangTidyIndex !== -1) {
            clangdArgs[clangTidyIndex] = '--clang-tidy=false';
        }

        // 修改 "--header-insertion" 为 "None"
        const headerInsertionIndex = clangdArgs.findIndex((arg) => arg.startsWith('--header-insertion'));
        if (headerInsertionIndex !== -1) {
            clangdArgs[headerInsertionIndex] = '--header-insertion=None';
        }   

        // 保存修改后的配置
        await clangdConfig.update('arguments', clangdArgs, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage('Clangd configuration updated successfully!');
    } catch (error: any) {
        vscode.window.showErrorMessage(`Failed to update clangd configuration: ${error.message}`);
    }
} 