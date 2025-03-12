import * as path from 'path';
import * as vscode from 'vscode';
import { Context } from '../helpers/context';
import { UnrealEngineProject } from '../types';
import * as fs from 'fs';

// Function to monitor log file
function monitorLogFile(logPath: string, outputChannel: vscode.OutputChannel) {
    let lastSize = 0;
    const checkInterval = setInterval(() => {
        if (fs.existsSync(logPath)) {
            const stat = fs.statSync(logPath);
            if (stat.size > lastSize) {
                const buffer = Buffer.alloc(stat.size - lastSize);
                const fd = fs.openSync(logPath, 'r');
                fs.readSync(fd, buffer, 0, stat.size - lastSize, lastSize);
                fs.closeSync(fd);
                // Add timestamp and format the log
                const logContent = buffer.toString()
                    .split('\n')
                    .map(line => {
                        if (line.trim()) {
                            if (line.includes('Error:')) {
                                return `[ERROR] ${line}`;
                            } else if (line.includes('Warning:')) {
                                return `[WARN] ${line}`;
                            } else {
                                return `[INFO] ${line}`;
                            }
                        }
                        return line;
                    })
                    .join('\n');
                outputChannel.append(logContent);
                lastSize = stat.size;
            }
        }
    }, 1000);

    // Return the interval ID so it can be cleared if needed
    return checkInterval;
}

interface LaunchProjectParams {
    target?: 'Editor' | 'Game';
    configuration?: 'Development' | 'Debug';
    isTrackEnable?: boolean;
}

export const openProject = (params: LaunchProjectParams = { target: 'Editor', configuration: 'Development', isTrackEnable: false }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            // check for project in the context
            const project = Context.get("project") as UnrealEngineProject;
            if (!project) {
                reject(new Error('No project found'));
                return;
            }

            // only support development mode
            if (params.configuration !== 'Development') {
                reject(new Error('Only development mode is supported'));
                return;
            }

            // check for unreal engine installation
            const unrealEngineInstallation = Context.get("unrealEngineInstallation") as string;
            const runtimePath = Context.get("runtimePath") as string;
            const projectFolder = Context.get("projectFolder") as string;

            // Create task to build project
            const os = process.platform;
            const scapeSpace = os === "win32" ? '` ' : '\\ '; 
            let buildOsType = "";
            let shellCommand;
            const launchTarget = params.target;
            const configuration = params.configuration || 'Development';

            // log launch params and project in same log    
            console.log('Launch Project: ', project, 'launchTarget: ', launchTarget, 'configuration: ', configuration);

            // Create output channel for UE logs
            const outputChannel = vscode.window.createOutputChannel("Unreal Engine Logs", "log");
            outputChannel.show(true);

            if (os === "win32") {
                buildOsType = "Win64";
                const projectPath = path.join(projectFolder, project.Modules[0].Name);
                
                // Construct command based on mode
                const projectArg = `-project="${projectPath}.uproject"`;
                let commandArgs = "";
                if (launchTarget ===  'Editor') {
                    commandArgs = `${projectArg} `;
                
                    const unrealEditorPath = Context.get("unrealEditorPath") as string;
                    shellCommand = new vscode.ShellExecution(
                        `$process = Start-Process -FilePath '${unrealEditorPath}' -ArgumentList '${commandArgs}' -PassThru; Wait-Process -Id $process.Id; exit $process.ExitCode`,
                        {    
                        cwd: unrealEngineInstallation
                        }
                    );
                } else if (launchTarget === 'Game') {
                    commandArgs = `-game ${projectArg} -WINDOWED -ResX=2560 -ResY=1440 `;
                    if (params.isTrackEnable) {
                        commandArgs += `-tracehost=127.0.0.1 -trace=cpu,frame,gpu -statnamevents`;
                    }

                    const gameExeName = project.Modules[0].Name + '.exe';

                    const unrealGamePath = path.join(projectPath, 'Binaries', 'Win64', gameExeName);
                    shellCommand = new vscode.ShellExecution(
                    `$process = Start-Process -FilePath '${unrealGamePath}' -ArgumentList '${commandArgs}' -PassThru; Wait-Process -Id $process.Id; exit $process.ExitCode`,
                    { 
                        cwd: unrealEngineInstallation
                    }
                );
                    
                } else {
                    reject(new Error('Invalid mode'));
                    return;
                }
                


                console.log('openProject shellCommand: ', shellCommand);

                // Setup log monitoring
                const logFileName = `${project.Modules[0].Name}.log`;
                const logPath = path.join(projectFolder, 'Saved', 'Logs', logFileName);
                let logMonitorInterval: NodeJS.Timeout;

                vscode.tasks.onDidStartTask((e) => {
                    if (e.execution.task === execution.task) {
                        const modeText = launchTarget === 'Editor' ? 'Unreal Editor' : 'Game';
                        outputChannel.appendLine(`Starting ${modeText} in ${configuration} mode...`);
                        // Start monitoring the log file after a short delay to ensure the process has started
                        setTimeout(() => {
                            logMonitorInterval = monitorLogFile(logPath, outputChannel);
                        }, 5000);
                    }
                });

                // Stop monitoring when the task ends
                vscode.tasks.onDidEndTask((e) => {
                    if (e.execution.task === execution.task) {
                        if (logMonitorInterval) {
                            clearInterval(logMonitorInterval);
                            const modeText = launchTarget === 'Editor' ? 'Editor' : 'Game';
                            outputChannel.appendLine(`${modeText} closed, stopping log monitor...`);
                        }
                        const modeText = launchTarget === 'Editor' ? 'Project editor' : 'Game';
                        vscode.window.showInformationMessage(`${modeText} closed for ${project.Modules[0].Name}`);
                        resolve(true);
                    }
                });
            } 

            const taskDefinition: vscode.TaskDefinition = { type: 'shell' };

            const taskName = launchTarget === 'Editor' ? 'Run Editor' : 'Run Game';
            const task = new vscode.Task(
                taskDefinition,
                vscode.workspace.workspaceFolders![0],
                taskName,
                'UETools',
                shellCommand
            );

            // Configure the task with problem matchers
            task.problemMatchers = ['$ue-editor'];

            // Configure the task presentation to use the integrated terminal
            task.presentationOptions = {
                reveal: vscode.TaskRevealKind.Always,
                panel: vscode.TaskPanelKind.Shared,
                showReuseMessage: false,
                clear: true,
                echo: true,
                focus: true
            };

            const taskList = Context.get("tasks") as vscode.Task[];
            const previousTaskIndex = taskList.findIndex((t) => t.name === task.name);
            if (previousTaskIndex > -1) {
                taskList.splice(previousTaskIndex, 1);
            }
            taskList.push(task);

            // Run task
            const execution = await vscode.tasks.executeTask(task);

            // Handle process output
            if (execution.task.execution instanceof vscode.ShellExecution) {
                execution.task.execution.commandLine && outputChannel.appendLine(`Command: ${execution.task.execution.commandLine}`);
            }
        })();
    });
};