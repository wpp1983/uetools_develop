import { EventEmitter } from "./EventDispatcher";
import { UnrealEngineProject } from "../types";

/**
 * Uunreal Tools context singleton class
 */
export class Context {
    // members
    private static _instance: Context;

    private _data: Map<string, any> = new Map();

    private _events = {
        onProjectChanged: new EventEmitter<UnrealEngineProject>(),
    };

    // methods

    private constructor() { }

    public static instance() {
        if (!Context._instance) {
            Context._instance = new Context();
        }
        return this._instance;
    }

    public static get(key: string) {
        return Context.instance()._data.get(key);
    }

    public static set(key: string, value: any) {
        Context.instance()._data.set(key, value);
    }

    public static get events() {
        return Context.instance()._events;
    }
}

export interface ProjectContext {
    project: UnrealEngineProject;
    projectPath: string;
    projectName: string;
    engineVersion: string;
    unrealEngineInstallation: string;
    unrealBuildToolPath: string;
    runtimePath: string;
}

export function validateProjectContext(): ProjectContext {
    const project = Context.get("project") as UnrealEngineProject;
    if (!project) {
        throw new Error('No project found');
    }

    const projectPath = Context.get("projectFolder") as string;
    if (!projectPath) {
        throw new Error('No project path found');
    }

    const projectName = Context.get("projectName") as string;
    if (!projectName) {
        throw new Error('No project name found');
    }

    const engineVersion = Context.get("engineVersion") as string;
    if (!engineVersion) {
        throw new Error('No engine version found');
    }

    const unrealEngineInstallation = Context.get("unrealEngineInstallation") as string;
    if (!unrealEngineInstallation) {
        throw new Error('No unreal engine installation found');
    }

    const unrealBuildToolPath = Context.get("unrealBuildToolPath") as string;
    if (!unrealBuildToolPath) {
        throw new Error('No unreal build tool path found');
    }

    const runtimePath = Context.get("runtimePath") as string;
    if (!runtimePath) {
        throw new Error('No runtime path found');
    }

    return {
        project,
        projectPath,
        projectName,
        engineVersion,
        unrealEngineInstallation,
        unrealBuildToolPath,
        runtimePath
    };
}