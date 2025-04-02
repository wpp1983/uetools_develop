import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { validateProjectContext, ProjectContext } from '../helpers/context';
import * as dyn from '../dynamic';
import * as consts from '../libs/consts';
import * as ueHelpers from '../libs/ueHelpers';

export async function generateClangdConfigFile(): Promise<void> {
    try {
        const context = validateProjectContext();
        const clangdConfigPath = path.join(context.projectPath, '.clangd');
        const platform = process.platform;
        
        // 使用默认值 5.5 如果 engineVersion 未定义
        const engineVersion = context.engineVersion || "5.5";

        console.log(engineVersion);
        
        // 将 engineVersion 字符串转换为 UnrealVersion 对象
        const ueVersion: ueHelpers.UnrealVersion = {
            major: parseInt(engineVersion.split('.')[0]),
            minor: parseInt(engineVersion.split('.')[1]),
            patch: parseInt(engineVersion.split('.')[2] || '0')
        };
        const addFlags = await getAddForClangdCfg(platform, ueVersion);
        
        if (!addFlags) {
            throw new Error('Failed to get compiler flags for Clangd config');
        }

        const config = {
            CompileFlags: {
                Add: addFlags,
            },
            Index: {
                Background: true
            },
            Diagnostics: {
                UnusedIncludes: ueVersion.major >= 5 && ueVersion.minor >= 5 ? "None" : "Strict",
                ClangTidy: false
            },
            Completion: {
                DetailedLabel: true
            }
        };

        fs.writeFileSync(clangdConfigPath, JSON.stringify(config, null, 2));
        vscode.window.showInformationMessage('.clangd configuration file generated successfully!');
    } catch (error) {
        console.error('Config file generation error:', error);
        throw new Error(`Failed to generate .clangd config file: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function getAddForClangdCfg(platform: NodeJS.Platform, ueVersion: ueHelpers.UnrealVersion): Promise<string[] | undefined> {
    const cppVersion = dyn.getCppVersion(ueVersion);
    if (!cppVersion) {
        console.error("Couldn't get cppVersion for Add in .clangd(UE Source)!");
        await vscode.window.showErrorMessage("Error creating Unreal Source project!");
        return undefined;
    }

    switch (platform) {
        case "win32":
            return [cppVersion].concat(consts.WIN_COMPILER_FLAGS_TO_ADD);
        default:
            console.error(`Platform not recognized! : ${process.platform}`);
            return undefined;
    }
} 