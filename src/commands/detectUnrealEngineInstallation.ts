import * as vscode from 'vscode';
import { UnrealEngineProject } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { Context } from '../helpers/context';

export const detectUnrealEngineInstallation = (): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {

            // check for project in the context
            const project = Context.get('project') as UnrealEngineProject;

            if (!project) {
                reject(new Error('No project found'));
                return false;
            }

            // check operating system
            const os = process.platform;

            // get unreal engine installation seach path and check if the version associated with project is installed
            let unrealEngineInstallationSearchPath = vscode.workspace.getConfiguration().get('uetools.unrealEngineInstallationSearchPath') as string;
            if(!unrealEngineInstallationSearchPath) {
                // try default installation path by operating system
                const os = process.platform;
                if (os === 'win32') {
                    unrealEngineInstallationSearchPath = 'C:\\Program Files\\Epic Games';
                } else if (os === 'darwin') {
                    unrealEngineInstallationSearchPath = '/Users/Shared/Epic Games';
                } else if(os === 'linux') {
                    unrealEngineInstallationSearchPath = '/opt/Epic Games';
                } else {
                    reject(new Error('Unreal Engine installation not found. Please set the path in settings.'));
                    return false;
                }
                if(fs.existsSync(unrealEngineInstallationSearchPath)) {
                    vscode.workspace.getConfiguration().update('uetools.unrealEngineInstallationSearchPath', unrealEngineInstallationSearchPath, vscode.ConfigurationTarget.Global);
                } else {
                    reject(new Error('Unreal Engine installation not found. Please set the path in settings.'));
                    return false;
                }
            }

            const folders = fs.readdirSync(unrealEngineInstallationSearchPath);

            let engineFolder = folders.find(folder => folder.includes(`UE_${project.EngineAssociation}`));

            // if no engine folder is found and there is only one folder, use that one
            if(!engineFolder ) {
                engineFolder = "";
            }

            // if(!engineFolder) {
            //     reject(new Error(`Unreal Engine ${project.EngineAssociation} not found in ${unrealEngineInstallationSearchPath}`));
            //     return false;
            // }


            Context.set("unrealEngineInstallation", path.join(unrealEngineInstallationSearchPath, engineFolder));
            
            // set UnrealBuildTool, UnrealEditor and Mono path based on Unreal version.
            // get engine version as number
            const engineVersion = parseInt(project.EngineAssociation.replace('UE_', ''));
            if(engineVersion === 4) {
                if(os === 'win32') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\DotNET\\UnrealBuildTool.exe'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\Win64\\UE4Editor.exe'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\ThirdParty\\DotNet\\Windows\\dotnet.exe'));
                } else if(os === 'darwin') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/DotNET/UnrealBuildTool.exe'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/Mac/UE4Editor.app/Contents/MacOS/UnrealEditor'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/ThirdParty/Mono/Mac/bin/mono'));
                } else if(os === 'linux') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/DotNET/UnrealBuildTool.exe'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/Linux/UE4Editor'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/ThirdParty/Mono/Linux/bin/mono'));
                } else {
                    reject(new Error(`Unsupported operating system: ${os}`));
                    return false;
                }
            } else {
                if(os === 'win32') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\DotNET\\UnrealBuildTool\\UnrealBuildTool.dll'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\Win64\\UnrealEditor.exe'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine\\Binaries\\ThirdParty\\DotNet\\Windows\\dotnet.exe'));
                } else if(os === 'darwin') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.dll'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/ThirdParty/DotNet/Mac/dotnet'));
                } else if(os === 'linux') {
                    Context.set("unrealBuildToolPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/DotNET/UnrealBuildTool/UnrealBuildTool.dll'));
                    Context.set("unrealEditorPath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/Linux/UnrealEditor'));
                    Context.set("runtimePath", path.join(Context.get('unrealEngineInstallation') as string, 'Engine/Binaries/ThirdParty/Mono/Linux/bin/mono'));
                } else {
                    reject(new Error(`Unsupported operating system: ${os}`));
                    return false;
                }
            }

            // Notify user the selected unreal engine installation
            vscode.window.showInformationMessage(`Unreal Engine installation ${engineFolder} selected.`);
            console.log(`Unreal Engine installation selected.`);
            resolve(true);
            return true;
        })();
    });
};