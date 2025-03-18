import * as vscode from 'vscode';
import { Context } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

interface BuildServerParams {
    configuration?: 'Development' | 'Debug';
}

export const buildServer = (params: BuildServerParams = { configuration: 'Development' }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            const project = Context.get("project") as UnrealEngineProject;
            if (!project) {
                reject(new Error('No project found'));
                return;
            }
            const projectFolder = Context.get("projectFolder") as string;

            const solutionPath = path.resolve(projectFolder, '..', 'server', 'src', 'products', 'Project_Mobile', 'bjmq_server', 'bjmq_server.sln');
            
            // 创建找到MSBuild并构建的批处理文件
            const cmdContent = `@echo off
echo Searching for MSBuild.exe...

set FOUND=0

if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2022 Community
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2022 Professional
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

if exist "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2022 Enterprise
  "C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

if exist "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2019 Community
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

if exist "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2019 Professional
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

if exist "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe" (
  echo Found MSBuild in Visual Studio 2019 Enterprise
  "C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe" "${solutionPath}"
  set FOUND=1
  goto end
)

:end
if %FOUND% == 0 (
  echo MSBuild.exe not found! Please install Visual Studio or add MSBuild to your PATH.
  exit /b 1
)

exit /b %ERRORLEVEL%`;
            
            // 写入批处理文件
            const tempDir = os.tmpdir();
            const batchFilePath = path.join(tempDir, 'build_server.bat');
            fs.writeFileSync(batchFilePath, cmdContent);
            
            // Create task to build server
            const platform = process.platform;
            let shellCommand;

            if (platform === "win32") {
                // 直接运行批处理文件
                shellCommand = new vscode.ShellExecution(
                    `cmd.exe /c "${batchFilePath}"`,
                    {
                        cwd: path.dirname(solutionPath)
                    }
                );
            } else {
                reject(new Error('Building .sln files is only supported on Windows'));
                return;
            }

            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                'Build Server',
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
            
            // 监听任务执行结束事件
            vscode.tasks.onDidEndTask((e) => {
                if (e.execution.task === execution.task) {
                    // 删除临时批处理文件
                    try {
                        fs.unlinkSync(batchFilePath);
                    } catch (err) {
                        console.error('Failed to delete temporary batch file:', err);
                    }
                    
                    vscode.window.showInformationMessage(`Server solution build completed`);
                    console.log('End: buildServer');
                    resolve(true);
                }
            });
            
            // 监听任务执行失败事件
            vscode.tasks.onDidEndTaskProcess((e) => {
                if (e.execution.task === execution.task && e.exitCode !== 0) {
                    // 删除临时批处理文件
                    try {
                        fs.unlinkSync(batchFilePath);
                    } catch (err) {
                        console.error('Failed to delete temporary batch file:', err);
                    }
                    
                    const vsInstallerUrl = 'https://visualstudio.microsoft.com/zh-hans/downloads/';
                    
                    const message = `构建失败 (Exit code: ${e.exitCode})。找不到MSBuild.exe，请安装Visual Studio或构建工具。`;
                    vscode.window.showErrorMessage(message, '下载Visual Studio', '查看文档').then(selection => {
                        if (selection === '下载Visual Studio') {
                            vscode.env.openExternal(vscode.Uri.parse(vsInstallerUrl));
                        } else if (selection === '查看文档') {
                            vscode.env.openExternal(vscode.Uri.parse('https://learn.microsoft.com/zh-cn/visualstudio/msbuild/msbuild'));
                        }
                    });
                    reject(new Error(`MSBuild execution failed with exit code: ${e.exitCode}`));
                }
            });
        })();
    });
}; 