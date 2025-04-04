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
import description from '../../description.json';
import { NotificationContext } from '../contexts/NotificationContext';
import { loadWasmModule } from '../gtoWasm';
import { detectDataType } from '../utils/detectDataType';

const ToolTestingPanel = ({ tool, inputData, setOutputData, setIsLoading }) => {
    const [validationErrors, setValidationErrors] = useState({}); // To store validation errors
    const [parameters, setParameters] = useState({});   // To store parameters
    const [helpMessages, setHelpMessages] = useState({}); // To store help messages

    // Find tool configuration and supported input formats
    const toolConfig = description.tools.find((t) => t.name === `gto_${tool.name}`);
    const inputFormats = toolConfig?.input.format.split(',').map((f) => f.trim()) || [];
    const outputFormats = toolConfig?.output.format.split(',').map((f) => f.trim()) || [];

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const showNotification = useContext(NotificationContext);

    useEffect(() => {
        if (tool && tool.name) {
            loadHelpMessage(tool.name);
        }
    }, [tool]);

    // Load help message for a tool
    const loadHelpMessage = async (toolName) => {
        try {
            const runFunction = await loadWasmModule(toolName);
            const outputData = await runFunction('', ['-h']); // Execute the tool with -h flag

            if (outputData.stderr) {
                console.error(`Error in ${toolName} help message: ${outputData.stderr}`);
            } else {
                const helpLines = outputData.stdout.split('\n'); // Divida o texto da ajuda em linhas
                const flagsHelp = {};
                let generalHelp = '';

                // Process each line of the help message
                helpLines.forEach((line) => {
                    line = line.trim();

                    // Separating flags and descriptions
                    if (/^-/.test(line)) {
                        const [flag, ...descriptionParts] = line.split(/\s+/); // Separating flag and description
                        const normalizedFlag = flag.replace(/[, ]/g, '').trim(); // Removing commas and spaces
                        flagsHelp[normalizedFlag] = descriptionParts.join(' '); // Store the description
                    } else if (
                        !line.includes('--help') &&
                        !line.toLowerCase().includes('optional') &&
                        !line.toLowerCase().includes('optional options')
                    ) {
                        generalHelp += `${line}\n`;
                    }
                });

                // Store the help messages
                setHelpMessages(
                    {
                        general: generalHelp.trim(),
                        flags: flagsHelp, // Store the flags help
                    },
                );
            }
        } catch (error) {
            console.error(`Failed to load help message for ${toolName}: ${error.message}`);
        }
    };

    // Validate parameters based on expected type
    const validateParameters = (tool) => {
        const toolConfig = description.tools.find((t) => t.name === `gto_${tool.name}`);
        const errors = {};

        toolConfig.flags.forEach((flagObj) => {
            const isFlagRequired = flagObj.required;
            const flagValue = !!parameters[flagObj.flag]; // Check if the flag is active
            const paramValue = parameters[flagObj.parameter];
            const paramConfig = toolConfig.parameters.find((param) => param.name === flagObj.parameter);

            if (paramConfig) {
                if (isFlagRequired || flagValue) { // Check if the flag is required or active
                    if (paramConfig.type === 'integer' && !/^-?\d+$/.test(paramValue)) {
                        errors[flagObj.parameter] = 'Invalid integer value';
                    } else if (paramConfig.type === 'float' && !/^-?\d+(\.\d+)?$/.test(paramValue)) {
                        errors[flagObj.parameter] = 'Invalid float value';
                    } else if (paramValue === undefined || paramValue === '') {
                        errors[flagObj.parameter] = 'Parameter value cannot be empty';
                    } else {
                        const numericValue = parseFloat(paramValue);
                        if (paramConfig.min !== undefined && numericValue < paramConfig.min) {
                            errors[flagObj.parameter] = `Value must be at least ${paramConfig.min}`;
                        }
                        if (paramConfig.max !== undefined && numericValue > paramConfig.max) {
                            errors[flagObj.parameter] = `Value must be at most ${paramConfig.max}`;
                        }
                        if (paramConfig.maxLength !== undefined && paramValue.length > paramConfig.maxLength) {
                            errors[flagObj.parameter] = `Maximum input length is ${paramConfig.maxLength}`;
                        }
                    }
                }
            } else if (isFlagRequired && (paramValue === undefined || paramValue === '')) {
                errors[flagObj.flag] = 'Required flag cannot be empty';
            }
        });

        // brute_force_string need to be limited, otherwise it will crash the browser
        if (tool.name === 'brute_force_string') {
            const alphabet = parameters['alphabet'];
            const size = parameters['size'];
            const max = 250000;

            if (alphabet && size && alphabet.length ** size > max) {
                showNotification('The number of possible combinations is too high. Please reduce the alphabet or the size.', 'error');
                toolConfig.flags.forEach((flagObj) => {
                    errors[flagObj.parameter] = 'Number of combinations is too high';
                });
            }
        }

        setValidationErrors(errors);

        if (Object.keys(errors).length > 0) {
            showNotification('Please correct the parameters highlighted in red.', 'error');
        }

        return Object.keys(errors).length === 0;
    };

    const handleParameterChange = (name, value) => {
        setParameters((prevParams) => ({
            ...prevParams,
            [name]: value,
        }));
    };

    const handleExecuteTool = async (tool) => {
        try {
            // Validate parameters before executing the tool
            const isValid = validateParameters(tool);
            if (!isValid) {
                // If validation fails, notify the user and cancel execution
                showNotification('Please correct the parameters highlighted in red.', 'error');
                return;
            }

            // Load the wrapper function dynamically
            const runFunction = await loadWasmModule(tool.name);

            // Find tool configuration from description.json
            const toolConfig = description.tools.find(
                (t) => t.name === `gto_${tool.name}`
            );
            if (!toolConfig) {
                showNotification(`Configuration for tool ${tool.name} not found.`, 'error');
                throw new Error(`Configuration for tool ${tool.name} not found.`);
            }

            // Prepare arguments based on tool configuration and user-set parameters
            let args = [];
            if (parameters && Object.keys(parameters).length > 0) {
                // Handle flags
                toolConfig.flags.forEach((flagObj) => {
                    if (flagObj.required || parameters[flagObj.flag]) {
                        args.push(flagObj.flag);
                        // Check if the flag has an associated parameter
                        if (
                            flagObj.parameter &&
                            parameters[flagObj.parameter] !== undefined &&
                            parameters[flagObj.parameter] !== ''
                        ) {
                            args.push(`${parameters[flagObj.parameter]}`);
                        }
                    }
                });
            }

            // Verify if the input data is compatible with the tool
            const inputDataType = detectDataType("input.txt", inputData);
            if (!inputFormats.includes(inputDataType) && toolConfig.input.type !== '') {
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
            const outputData = await runFunction(inputData, args);

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

            setOutputData(outputData.stdout);
        } catch (error) {
            console.error(`Failed to execute tool ${tool.name}:`, error);
            throw error;
        }
    };

    const renderParameters = (tool) => {
        const toolConfig = description.tools.find((t) => t.name === `gto_${tool.name}`);
        if (!toolConfig) return null;

        const toolHelp = helpMessages || { general: 'Loading help...', flags: {} };
        const flagHelpMessages = toolHelp.flags || {};

        // Filter flags based on required and optionals
        const requiredFlags = toolConfig.flags.filter((flagObj) => flagObj.required && flagObj.flag !== '-h');
        const optionalFlags = toolConfig.flags.filter((flagObj) => !flagObj.required && flagObj.flag !== '-h');

        return (
            <Box sx={{ marginTop: 1 }}>
                {/* Required Flags */}
                {requiredFlags.length > 0 && (
                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                marginBottom: 1,
                                color: 'text.secondary',
                            }}
                        >
                            Required Flags
                        </Typography>
                        {requiredFlags.map((flagObj) => {
                            const flagValue = !!parameters[flagObj.flag];
                            const parameterValue = parameters[flagObj.parameter] || '';
                            const error = validationErrors[flagObj.parameter] || '';

                            return (
                                <Box
                                    key={flagObj.flag}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: 1,
                                        gap: 2,
                                    }}
                                >
                                    <FormControlLabel
                                        control={<span />}
                                        label={
                                            <Tooltip
                                                title={flagHelpMessages[flagObj.flag] || 'Loading help message...'}
                                                arrow
                                                componentsProps={{
                                                    tooltip: {
                                                        sx: {
                                                            maxWidth: 300,
                                                            whiteSpace: 'pre-wrap',
                                                        },
                                                    },
                                                }}
                                            >
                                                <span>
                                                    {flagObj.flag} <span style={{ color: 'red' }}>*</span>
                                                </span>
                                            </Tooltip>
                                        }
                                        sx={{ alignItems: 'center', margin: 0 }}
                                    />
                                    {flagObj.parameter && (
                                        <TextField
                                            key={flagObj.parameter}
                                            value={parameterValue}
                                            onChange={(e) =>
                                                handleParameterChange(flagObj.parameter, e.target.value)
                                            }
                                            size="small"
                                            label={flagObj.parameter}
                                            error={!!error}
                                            helperText={error}
                                            sx={{
                                                flexGrow: 1,
                                                '& .MuiOutlinedInput-root': {
                                                    borderColor: error ? 'red' : 'default',
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': error
                                                    ? {
                                                        borderColor: 'red',
                                                        borderWidth: '1px',
                                                    }
                                                    : {},
                                            }}
                                            type={
                                                toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'integer'
                                                    ? 'number'
                                                    : toolConfig.parameters.find((p) => p.name === flagObj.parameter)
                                                        ?.type === 'float'
                                                        ? 'number'
                                                        : 'text'
                                            }
                                            inputProps={
                                                toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'integer' ||
                                                    toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'float'
                                                    ? { step: 'any' }
                                                    : {}
                                            }
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                )}

                {/* Optional Flags */}
                {optionalFlags.length > 0 && (
                    <Box>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                marginBottom: 1,
                                flexGrow: 1,
                                color: 'text.secondary',
                            }}
                        >
                            Optional Flags
                        </Typography>

                        {optionalFlags.map((flagObj) => {
                            const flagValue = !!parameters[flagObj.flag];
                            const parameterValue = parameters[flagObj.parameter] || '';
                            const error = validationErrors[flagObj.parameter] || '';

                            return (
                                <Box
                                    key={flagObj.flag}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        marginBottom: 1,
                                        gap: 2,
                                    }}
                                >
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={flagValue}
                                                onChange={(e) =>
                                                    handleParameterChange(flagObj.flag, e.target.checked)
                                                }
                                                color='primary'
                                            />
                                        }
                                        label={
                                            <Tooltip
                                                title={flagHelpMessages[flagObj.flag] || 'Loading help message...'}
                                                arrow
                                                componentsProps={{
                                                    tooltip: {
                                                        sx: {
                                                            maxWidth: 300,
                                                            whiteSpace: 'pre-wrap',
                                                        },
                                                    },
                                                }}
                                            >
                                                <span>{flagObj.flag}</span>
                                            </Tooltip>
                                        }
                                        sx={{ alignItems: 'center', margin: 0 }}
                                    />
                                    {flagObj.parameter && flagValue && (
                                        <TextField
                                            value={parameterValue}
                                            onChange={(e) =>
                                                handleParameterChange(flagObj.parameter, e.target.value)
                                            }
                                            size="small"
                                            label={flagObj.parameter}
                                            error={!!error}
                                            helperText={error}
                                            sx={{
                                                flexGrow: 1,
                                                '& .MuiOutlinedInput-root': {
                                                    borderColor: error ? 'red' : 'default',
                                                },
                                                '& .MuiOutlinedInput-notchedOutline': error
                                                    ? {
                                                        borderColor: 'red',
                                                        borderWidth: '1px',
                                                    }
                                                    : {},
                                                alignSelf: 'center',
                                            }}
                                            type={
                                                toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'integer'
                                                    ? 'number'
                                                    : toolConfig.parameters.find((p) => p.name === flagObj.parameter)
                                                        ?.type === 'float'
                                                        ? 'number'
                                                        : 'text'
                                            }
                                            inputProps={
                                                toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'integer' ||
                                                    toolConfig.parameters.find((p) => p.name === flagObj.parameter)?.type ===
                                                    'float'
                                                    ? { step: 'any' }
                                                    : {}
                                            }
                                        />
                                    )}
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        );
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
                            title={<pre style={{ whiteSpace: 'pre-wrap' }}>{helpMessages.general || 'Loading help...'}</pre>}
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
                    {toolConfig.flags.length > 1 && (
                        <Typography variant="body1" gutterBottom>
                            Flags and Parameters
                        </Typography>
                    )}
                    {renderParameters(tool)}

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
