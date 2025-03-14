import * as vscode from 'vscode';
import { Context } from '../../helpers/context';
import { UnrealEngineProject } from '../../types';

interface LaunchProjectParams {
    target?: 'Editor' | 'Game';
    configuration?: 'Development' | 'Debug';
    isTrackEnable?: boolean;
}

export const launchProject = (params: LaunchProjectParams = { target: 'Editor', configuration: 'Development', isTrackEnable: false }): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        (async () => {
            // check for project in the context
            const project = Context.get("project") as UnrealEngineProject;
            if (!project) {
                reject(new Error('No project found'));
                return;
            }

            try {
                // Only build if launching Editor
                if (params.target === 'Editor') {
                    await vscode.commands.executeCommand('uetools.buildProject', {
                        target: params.target,
                        configuration: params.configuration
                    });
                }

                // Then open the project
                await vscode.commands.executeCommand('uetools.openProject', {
                    target: params.target,
                    configuration: params.configuration,
                    isTrackEnable: params.isTrackEnable
                });

                resolve(true);
            } catch (error) {
                console.error('Error in launchProject:', error);
                reject(error);
            }
        })();
    });
}; 