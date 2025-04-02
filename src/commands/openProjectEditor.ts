import * as path from 'path';
import * as vscode from 'vscode';
import { Context, validateProjectContext } from '../helpers/context';
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

export const openProjectEditor = (): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const context = validateProjectContext();

            // Create task to open project in editor
            const os = process.platform;
            const projectPath = path.join(context.projectPath, context.projectName);
            
            let shellCommand;
            if (os === 'win32') {
                shellCommand = new vscode.ShellExecution(
                    `"${context.runtimePath}" "${projectPath}.uproject"`,
                    { cwd: context.projectPath }
                );
            } else if (os === 'darwin') {
                shellCommand = new vscode.ShellExecution(
                    `${context.runtimePath.split(' ').join('\\ ')} ${projectPath.split(' ').join('\\ ')}.uproject`,
                    { cwd: context.projectPath }
                );
            } else if (os === 'linux') {
                shellCommand = new vscode.ShellExecution(
                    `${context.runtimePath.split(' ').join('\\ ')} ${projectPath.split(' ').join('\\ ')}.uproject`,
                    { cwd: context.projectPath }
                );
            }

            // Create output channel for UE logs
            const outputChannel = vscode.window.createOutputChannel('UE Editor Logs');
            outputChannel.show();

            // Create task
            const task = new vscode.Task(
                { type: 'shell' },
                vscode.workspace.workspaceFolders![0],
                'Open Project Editor',
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
            vscode.tasks.executeTask(task).then((execution) => {
                // Handle process output
                if (execution.task.execution instanceof vscode.ShellExecution) {
                    execution.task.execution.commandLine && outputChannel.appendLine(`Command: ${execution.task.execution.commandLine}`);
                }

                // Monitor log file
                let logMonitorInterval: NodeJS.Timeout | undefined;
                let logPath: string | undefined;

                if (os === 'win32') {
                    const logFileName = `${context.projectName}.log`;
                    logPath = path.join(context.projectPath, 'Saved', 'Logs', logFileName);
                }

                vscode.tasks.onDidStartTask((e) => {
                    if (e.execution.task === execution.task) {
                        outputChannel.appendLine('Starting Unreal Editor...');
                        // Start monitoring the log file after a short delay to ensure the process has started
                        if (logPath) {
                            setTimeout(() => {
                                logMonitorInterval = setInterval(() => {
                                    try {
                                        const logContent = fs.readFileSync(logPath!, 'utf8');
                                        outputChannel.appendLine(logContent);
                                    } catch (error: unknown) {
                                        // Ignore file not found errors
                                    }
                                }, 1000);
                            }, 2000);
                        }
                    }
                });

                vscode.tasks.onDidEndTask((e) => {
                    if (e.execution.task === execution.task) {
                        if (logMonitorInterval) {
                            clearInterval(logMonitorInterval);
                            outputChannel.appendLine('Editor closed, stopping log monitor...');
                        }
                        vscode.window.showInformationMessage(`Project editor closed for ${context.projectName}`);
                        resolve(true);
                    }
                });
            }).catch((error: unknown) => {
                reject(error);
            });
        } catch (error: unknown) {
            reject(error);
        }
    });
};