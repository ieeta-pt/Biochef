import SaveIcon from '@mui/icons-material/Save';
import { Box, FormControl, IconButton, MenuItem, Paper, Select, TextField, Tooltip, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import React, { useEffect, useState, useContext } from 'react';
import { TourContext } from '../contexts/TourContext';
import { dataValueToString, isDataValue } from '../utils/dataValue';

const ToolOutputPanel = ({ outputData, setOutputData, workflow = null, tool = null, inputData, page, rows = 8 }) => {
    const [selectedOutput, setSelectedOutput] = useState('');
    const [displayedOutput, setDisplayedOutput] = useState('');
    const { tourRegisterSteps } = useContext(TourContext);

    useEffect(() => {
        tourRegisterSteps("t-output", [
            {
                element: '[data-tour="output"]',
                popover: {
                    title: "Viewing Output",
                    description: "This section displays the results of the tool after it has finished running.",
                },
            },
            {
                element: '[data-tour="export-output"]',
                popover: {
                    title: "Exporting Output",
                    description: "If you want to save your results, you can export the output to a file using this icon.",
                },
            },
        ]);
    }, []);


    // Update displayed output when outputData or selectedOutput changes
    useEffect(() => {
        if (!outputData || Object.keys(outputData).length === 0) {
            setDisplayedOutput("")
            return
        }

        // if it has multiple outputs, get the one for the currently selected output
        if (!isDataValue(outputData) && typeof outputData === 'object') {
            let outputToSelect = selectedOutput
            if (!outputToSelect || !Object.hasOwn(outputData, outputToSelect)) {
                outputToSelect = Object.keys(outputData)[0]
                setSelectedOutput(outputToSelect)
            }
            outputData = outputData[outputToSelect]
        }
        else {
            setSelectedOutput(Object.keys(outputData)[0])
        }

        if (outputData?.kind == "binary") {
            setDisplayedOutput(dataValueToString(outputData))
        }
        else if (outputData?.kind == "text") {
            setDisplayedOutput(outputData.data)
        }
    }, [outputData, selectedOutput]);

    // Clear output data when workflow or input data changes, beacuse the output data is no longer valid
    useEffect(() => {
        if (workflow !== null) {
            setOutputData('');
        }
    }, [workflow, inputData]);

    // Clear output data when tool or input data changes, because the output data is no longer valid
    useEffect(() => {
        if (tool !== null) {
            setOutputData('');
        }
    }, [tool, inputData]);

    const handleSaveOutput = () => {
        if (typeof outputData == 'object' && !isDataValue(outputData)) {
            const zip = new JSZip();
            for (const [outputName, content] of Object.entries(outputData)) {
                zip.file(outputName, content.data);
            }
            zip.generateAsync({ type: 'blob' }).then((content) => {
                saveAs(content, 'output.zip');
            });
        }
        else {
            let content
            if (outputData?.kind == "binary") {
                content = outputData.data
            }
            else {
                content = displayedOutput
            }

            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `output`; // TODO get the correct file extension
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleFileChange = (event) => {
        setSelectedOutput(event.target.value);
    };

    return (
        <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-tour="output">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Typography variant="h6">Output</Typography>
                {typeof outputData === 'object' && !isDataValue(outputData) && !Array.isArray(outputData) && Object.keys(outputData).length > 1 && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={selectedOutput}
                            onChange={handleFileChange}
                            displayEmpty
                        >
                            {Object.keys(outputData).map((filename) => (
                                <MenuItem key={filename} value={filename}>
                                    {filename}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            </Box>
            {/* TextField with dynamic height */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 2 }}>
                <TextField
                    variant="outlined"
                    value={displayedOutput}
                    placeholder="Output Data"
                    InputProps={{
                        multiline: true,
                        inputComponent: 'textarea',
                        readOnly: true,
                    }}
                    rows={rows}
                    sx={{
                        flexGrow: 1,
                        flexShrink: 1,
                        overflow: 'auto',
                        minHeight: '100px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        fontSize: '0.875rem',
                    }}
                />
            </Box>
            {/* Save button always visible */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    padding: 1,
                    flexShrink: 0,
                    backgroundColor: 'white',
                }}
            >
                <Tooltip title="Save Output">
                    <IconButton color={'primary'} onClick={handleSaveOutput} data-tour="export-output">
                        <SaveIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default ToolOutputPanel;