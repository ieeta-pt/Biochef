// RecipePanel.jsx
import {
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { HelpOutline, PlayArrow } from '@mui/icons-material';
import {
    Box,
    Button,
    FormControlLabel,
    IconButton,
    Paper,
    Switch,
    TextField,
    Tooltip,
    Typography
} from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { getTool } from '../utils/toolUtils';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { runTool } from '../utils/toolUtils';
import { detectDataType } from '../utils/detectDataType';
import { processFile } from '../utils/fileProcessor';
import { validateParameters, getToolHelpMessage } from '../utils/parameterUtils';
import ToolParameterSection from './ToolParameterSection';

const ToolTestingPanel = ({ tool, inputData, setOutputData, setIsLoading }) => {
    const [validationErrors, setValidationErrors] = useState({}); // To store validation errors
    const [parameters, setParameters] = useState({});   // To store parameters
    const [helpMessages, setHelpMessages] = useState({}); // To store help messages
    const [toolParameterFiles, setToolParameterFiles] = useState({}); // To store tool parameter files
    const { validateData } = useContext(DataTypeContext);

    // Find tool configuration and supported input formats
    const toolConfig = getTool(tool.name)
    const inputFormats = toolConfig.inputTypes
    const outputFormats = toolConfig.outputTypes
    const showNotification = useContext(NotificationContext);

    // load default values for each parameter
    // and set optionals to be disabled by default
    useEffect(() => {
        setParameters((prevParams) => {
            const updatedParams = { ...prevParams };

            toolConfig.parameters.forEach((param) => {
                if (param.name in updatedParams && !param.hidden) return
                updatedParams[param.name] = {
                    value: param.default !== undefined ? param.default : '',
                    enabled: false
                };
            });

            return updatedParams;
        });
    }, [toolConfig]);

    useEffect(() => {
        const fetchHelpMessages = async () => {
            if (tool && tool.name) {
                const help = await getToolHelpMessage(tool.name);
                setHelpMessages(help);
            }
        };

        fetchHelpMessages();
    }, [tool]);

    const handleParameterChange = async (name, value) => {
        let paramValue = value;

        if (value instanceof File) {
            const processedFile = await processFile(value, validateData, showNotification);
            if (!processedFile) return;

            paramValue = processedFile.name;

            const fileObj = { name: processedFile.name, data: processedFile.content };
            setToolParameterFiles((prev) => ({
                ...prev,
                [name]: fileObj,
            }));
        }

        setParameters((prevParams) => ({
            ...prevParams,
            [name]: {
                value: paramValue,
                enabled: prevParams[name]?.enabled ?? true, // preserve or default to true
            },
        }));

        // clear validation errors
        setValidationErrors({})
    };

    const toggleParameter = (name) => {
        setParameters((prevParams) => ({
            ...prevParams,
            [name]: {
                ...prevParams[name],
                enabled: !prevParams[name]?.enabled,
            },
        }));

        // clear validation errors
        setValidationErrors({})
    };

    const handleExecuteTool = async (tool) => {
        try {
            // Validate parameters before executing the tool
            const { isValid, errors } = validateParameters(tool.name, parameters);
            if (!isValid) {
                // If validation fails, notify the user and cancel execution
                showNotification('Please correct the parameters highlighted in red.', 'error');
                setValidationErrors(errors);
                return;
            }

            const toolConfig = getTool(tool.name)
            if (!toolConfig) {
                showNotification(`Configuration for tool ${tool.name} not found.`, 'error');
                throw new Error(`Configuration for tool ${tool.name} not found.`);
            }

            // Prepare arguments based on tool configuration and user-set parameters
            let args = [];
            toolConfig.parameters.forEach((param) => {
                if (param.required || parameters[param.name].enabled) {
                    if (param.flag) args.push(param.flag);
                    if (param.type != "flag") {
                        args.push(parameters[param.name].value);
                    }
                }
            });

            // Verify if the input data is compatible with the tool
            const inputDataType = detectDataType("input.txt", inputData);
            if (!inputFormats.includes(inputDataType) && toolConfig.input.type !== '' && toolConfig.input.type !== 'file') {
                showNotification(
                    `Input data type ${inputDataType} is not supported by tool ${tool.name}.`,
                    'error'
                );
                console.error(
                    `Input data type ${inputDataType} is not supported by tool ${tool.name}.`
                );
                return;
            }

            // Ensure input is defined
            if (inputData === undefined || inputData === null) {
                inputData = '';
            }

            // Execute the tool
            let outputData = await runTool(tool.name, inputData, args, toolParameterFiles);

            // Handle messages in stderr
            if (outputData.stderr) {
                const stderrLines = outputData.stderr.split('\n');
                let infoMessages = []; // Accumulate all informational messages

                stderrLines.forEach((line) => {
                    if (line.trim().startsWith('ERROR:')) {
                        throw new Error(line.trim()); // Treat as an error
                    } else if (line.trim()) {
                        infoMessages.push(line.trim()); // Accumulate info messages
                    }
                });

                // Display all accumulated informational messages together
                if (infoMessages.length > 0) {
                    showNotification(infoMessages.join('\n'), 'info');
                }
            }

            if (toolConfig.is_multi_output) {
                // outputData has a outputData.outputs that is an object with keys as output names and values as the output data
                const output = {};
                for (const [key, value] of Object.entries(outputData.outputs)) {
                    output[key] = value;
                }
                return setOutputData(output);
            } else {
                return setOutputData(outputData.stdout);
            }
        } catch (error) {
            console.error(`Failed to execute tool ${tool.name}:`, error);
            throw error;
        }
    };

    return (
        <Paper
            elevation={3}
            sx={{ padding: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                <Typography variant="h6" gutterBottom>
                    Tool Testing
                </Typography>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <Paper
                    elevation={1}
                    sx={{
                        transition: 'transform 150ms ease, background-color 300ms ease, border-color 300ms ease', // Smooth transition for both color and transform
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'grab',
                        backgroundColor: 'white', // Default background
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                            Tool: {tool.name}
                        </Typography>
                        <Tooltip
                            title={<pre style={{ whiteSpace: 'pre-wrap' }}>{helpMessages?.general || 'Loading help...'}</pre>}
                            arrow
                            componentsProps={{
                                tooltip: {
                                    sx: {
                                        maxWidth: 'none',
                                    },
                                },
                            }}
                        >
                            <IconButton size="small" sx={{ marginLeft: 1 }}>
                                <HelpOutline fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Input and Output Formats */}
                    <Box sx={{ marginBottom: 3 }}>
                        <Typography variant="body1" gutterBottom>
                            Supported Formats
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Input:</Typography>
                                <Typography variant="body2">
                                    {inputFormats.length > 0 ? inputFormats.join(', ') : 'None available'}
                                </Typography>
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>Output:</Typography>
                                <Typography variant="body2">
                                    {outputFormats.length > 0 ? outputFormats.join(', ') : 'None available'}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Flags Section */}
                    {toolConfig.parameters.length > 1 && (
                        <Typography variant="body1" gutterBottom>
                            Flags and Parameters
                        </Typography>
                    )}
                    <ToolParameterSection
                        toolConfig={toolConfig}
                        parameters={parameters}
                        validationErrors={validationErrors}
                        helpMessages={helpMessages?.flags}
                        handleParameterChange={handleParameterChange}
                        toggleParameter={toggleParameter}
                    />

                    <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleExecuteTool(tool)}
                        startIcon={<PlayArrow />}
                        sx={{ marginTop: 2 }} // Adiciona espaçamento no topo
                    >
                        Run Tool
                    </Button>
                </Paper>
            </Box >
        </Paper >
    );
};

export default ToolTestingPanel;
