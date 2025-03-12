// Check if the workspace contains a UProject file
import * as fs from 'fs';
import { Context } from '../helpers/context';
import * as vscode from 'vscode';

// import types
import { UnrealEngineProject, UnrealEnginePlugin } from '../types';

const checkUnrealProject = (): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;

            // Check if the workspaces contains a any file with the extension .uproject
            if (workspaceFolders) {
                for (const folder of workspaceFolders) {
                    const files = fs.readdirSync(folder.uri.fsPath);
                    for (const file of files) {
                        if (file.endsWith('.uproject')) {
                            // parse the file and cast it as UnrealEngineProject
                            const project = JSON.parse(fs.readFileSync(`${folder.uri.fsPath}/${file}`, { encoding: 'utf8' }).replace(/^\uFEFF/, '')) as UnrealEngineProject;

                                    // if Plugins folder exists, check each subfolder for a .uplugin file
                                    if (fs.existsSync(`${folder.uri.fsPath}/Plugins`)) {
                                        try {
                                            const pluginDirs = fs.readdirSync(`${folder.uri.fsPath}/Plugins`);
                                            project.ProjectPlugins = [];
                                            for (const pluginDir of pluginDirs) {
                                                try {
                                                    const pluginPath = `${folder.uri.fsPath}/Plugins/${pluginDir}/${pluginDir}.uplugin`;
                                                    if (fs.existsSync(pluginPath)) {
                                                        const fileContent = fs.readFileSync(pluginPath, { encoding: 'utf8' }).replace(/^\uFEFF/, '');
                                                        const jsonContent = JSON.parse(fileContent);
                                                        const plugin = jsonContent as UnrealEnginePlugin;
                                                        project.ProjectPlugins.push(plugin);
                                                    }
                                                } catch (pluginError) {
                                                    // console.error(`Error processing plugin ${pluginDir}:`, pluginError);
                                                    vscode.window.showWarningMessage(`Failed to process plugin ${pluginDir}. Some plugin information may be missing.`);
                                                }
                                            }
                                        } catch (pluginsDirError) {
                                            console.error('Error reading Plugins directory:', pluginsDirError);
                                            vscode.window.showWarningMessage('Failed to read Plugins directory. Plugin information may be missing.');
                                        }
                                    }

                            //persist project workspace folder
                            Context.set('projectFolder', folder.uri.fsPath);

                            // persist the UnrealEngineProject in the global state
                            Context.set('project', project);

                            // notify the user that the workspace is a valid Unreal Engine project
                            vscode.window.showInformationMessage(`Unreal Engine project ${project.Modules[0].Name} found associated with Engine Version: ${project.EngineAssociation}.`);

                            // save the project information in vscode workspace settings
                            vscode.workspace.getConfiguration().update('uetools.project', project, vscode.ConfigurationTarget.WorkspaceFolder);

                            Context.events.onProjectChanged.emit(project);
                            resolve(true);
                            return true;
                        }
                    }
                }
            }
        })();
    });
};

export default checkUnrealProject;