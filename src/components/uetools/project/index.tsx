// draw a button with a text
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as path from 'path';
import VSCodeWrapper from '../../../types/VSCodeApi';
import { UnrealEngineProject } from '../../../types';
import styled from 'styled-components';
import { Layout } from '../../styles/Layout';

// Base panel with components on horizontal layout
// to the left the thumbnail with fixed size, to the right the project description
// if to narrow, the thumbnail goes to the top and the project description goes to the bottom
const DescriptionPanel = styled.div`
    position: relative;
    padding: 10px;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: stretch;
    align-content: stretch;
    overflow: hidden;
    border-radius: 5px;
`;

// Project details Panel with translucent glass effect background
const ProjectDetailsPanel = styled.div`
    flex-grow: 2;
    padding: 10px;
    border-radius: 5px;
    background-color: #00000099;
`;

// Splash background image and fit to the div
const BackgroundImage = styled.div<{img: string}>`
    background-image: url(${props => props.img});
    position: absolute;
    top: 0; left: 0; bottom: 0; right: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    z-index: -100;
`;

// project thumbnail with fixed aspect ratio
const ProjectThumbnail = styled.div<{img: string, width: number, height: number}>`
    width: ${props => props.width}px;
    height: ${props => props.height}px;
    background-image: url(${props => props.img});
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 5px;
    margin-right: 10px;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
`;

const ProjectTitle = styled.h1`
    font-size: 1.5em;
    font-weight: bold;
    margin: 0;
    color: white;
`;

const Text = styled.p`
    margin: 0;
`;

// Bootstrap like blue button
const Button = styled.button`
    background-color: #007bff;
    border-color: #007bff;
    color: white;
    border-radius: 5px;
    padding: 5px 10px;
    margin: 5px;
    font-size: 0.8em;
    font-weight: bold;
    cursor: pointer;
`;

const Select = styled.select`
    background-color: #333333;
    color: white;
    border: 1px solid #007bff;
    border-radius: 5px;
    padding: 5px 10px;
    margin: 5px;
    font-size: 0.8em;
    cursor: pointer;
`;

const BuildOptionsWrapper = styled.div`
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 5px;
    background-color: #333333;
`;

const ButtonsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: stretch;
    align-content: stretch;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 5px;
    margin-bottom: 10px;
    background-color: #333333;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
`;

export const Project = () => 
{   
    const [project, setProject] = React.useState<UnrealEngineProject>();
    const [buildTarget, setBuildTarget] = React.useState<'Editor' | 'Game'>('Editor');
    const [buildConfiguration, setBuildConfiguration] = React.useState<'Development' | 'Debug'>('Development');

    VSCodeWrapper.onMessage((message) => {
        setProject(message.data.project);
    });

    const onOpenProject = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.launchProject',
            args: {
                target: buildTarget,
                configuration: buildConfiguration
            }
        });
    };

    const onBuildProject = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.buildProject',
            args: {
                target: buildTarget,
                configuration: buildConfiguration
            }
        });
    };

    const onPackageProject = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.packageProject',
            args: {
                configuration: buildConfiguration
            }
        });
    };

    const onBuildData = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.buildData',
        });
    };  

    const onStartServer = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.startServer',
        });
    };

    const onBuildServer = () => {
        VSCodeWrapper.postMessage({
            type: 'runCommand',
            command: 'uetools.buildServer',
        });
    };
    

    return (
        <>
            <DescriptionPanel>
                <BackgroundImage img={VSCodeWrapper.extensionUri + encodeURI(`/res/images/uesplash.jpg`)}/>
                <ProjectThumbnail img={VSCodeWrapper.workspaceUri + encodeURI(`/${project?.Modules[0].Name}.png`)} width={100} height={100}/>
                <ProjectDetailsPanel>
                    <ProjectTitle>{project?.Modules[0].Name}</ProjectTitle>
                    <Text>Unreal Engine {project?.EngineAssociation}</Text>
                </ProjectDetailsPanel>
            </DescriptionPanel>
            <ButtonsWrapper>
                <BuildOptionsWrapper>
                    <Select value={buildConfiguration} onChange={(e) => setBuildConfiguration(e.target.value as 'Development' | 'Debug')}>
                        <option value="Development">Development</option>
                        <option value="Debug">Debug</option>
                    </Select>
                    <Button onClick={() => {
                        VSCodeWrapper.postMessage({
                            type: 'runCommand',
                            command: 'uetools.launchProject',
                            args: {
                                target: 'Editor',
                                configuration: buildConfiguration
                            }
                        });
                    }}>
                        Launch Editor
                    </Button>
                    <Button onClick={() => {
                        VSCodeWrapper.postMessage({
                            type: 'runCommand',
                            command: 'uetools.buildProject',
                            args: {
                                target: 'Editor',
                                configuration: buildConfiguration
                            }
                        });
                    }}>
                        Build Editor
                    </Button>
                </BuildOptionsWrapper>

                <BuildOptionsWrapper>
                    <Select value={buildConfiguration} onChange={(e) => setBuildConfiguration(e.target.value as 'Development' | 'Debug')}>
                        <option value="Development">Development</option>
                        <option value="Debug">Debug</option>
                    </Select>
                    <Button onClick={() => {
                        VSCodeWrapper.postMessage({
                            type: 'runCommand',
                            command: 'uetools.buildProject',
                            args: {
                                target: 'Game',
                                configuration: buildConfiguration
                            }
                        });
                    }}>
                        Build Game
                    </Button>
                    <Button onClick={onPackageProject}>
                        Package Game
                    </Button>
                    <Button onClick={() => {
                        VSCodeWrapper.postMessage({
                            type: 'runCommand',
                            command: 'uetools.launchProject',
                            args: {
                                target: 'Game',
                                configuration: buildConfiguration
                            }
                        });
                    }}>
                        Launch Game
                    </Button>
                </BuildOptionsWrapper>

                <BuildOptionsWrapper>
                    <Button onClick={onBuildData}>
                        Build TS Data
                    </Button>
                    <Button onClick={onBuildServer}>
                        Build Server
                    </Button>
                    <Button onClick={onStartServer}>
                        Start Game Server
                    </Button>
                </BuildOptionsWrapper>
            </ButtonsWrapper>
        </>
    );
};

ReactDOM.render(
	<Project/>,
	document.getElementById('root')
);

VSCodeWrapper.postMessage({type: 'onReady', data: 'Hello from the extension!'});