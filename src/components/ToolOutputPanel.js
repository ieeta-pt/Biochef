import SaveIcon from '@mui/icons-material/Save';
import { Box, FormControl, IconButton, MenuItem, Paper, Select, TextField, Tooltip, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import React, { useEffect, useState, useContext } from 'react';
import { TourContext } from '../contexts/TourContext';
import { isDataValue } from '../utils/dataValue';

// Map declared binary types to a sensible download MIME + extension.
const BINARY_MIME = { BAM: 'application/x-bam', BCF: 'application/x-bcf', CRAM: 'application/x-cram', BIN: 'application/octet-stream' };
const BINARY_EXT  = { BAM: '.bam', BCF: '.bcf', CRAM: '.cram', BIN: '.bin' };

const ToolOutputPanel = ({ outputData, setOutputData, workflow = null, tool = null, inputData, page, rows=8 }) => {
    const [selectedFile, setSelectedFile] = useState('');
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


    const renderableText = (value) => {
        if (value === undefined || value === null) return '';
        if (isDataValue(value)) {
            // Don't try to dump raw bytes into the textarea.
            if (value.kind === 'binary') {
                const len = value.data?.length ?? 0;
                return `[binary ${value.type || 'BIN'}, ${len} bytes - use Save to download]`;
            }
            return value.data ?? '';
        }
        return value;
    };

    // Update displayed output when outputData or selectedFile changes
    useEffect(() => {
        // Multi-file object case (NOT a single DataValue object)
        if (typeof outputData === 'object' && outputData !== null && !Array.isArray(outputData) && !isDataValue(outputData)) {
            if (Object.keys(outputData).length > 0) {
                if (selectedFile && outputData[selectedFile]) {
                    setDisplayedOutput(renderableText(outputData[selectedFile]));
                } else {
                    const firstKey = Object.keys(outputData)[0];
                    setSelectedFile(firstKey);
                    setDisplayedOutput(renderableText(outputData[firstKey]));
                }
            } else {
                setDisplayedOutput('');
                setSelectedFile('');
            }
        } else {
            // Single-output case (string OR DataValue)
            setDisplayedOutput(renderableText(outputData));
            setSelectedFile('');
        }
    }, [outputData, selectedFile]);

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
        // Binary DataValue → download as proper binary blob with declared MIME + ext.
        if (isDataValue(outputData) && outputData.kind === 'binary') {
            const t = outputData.type || 'BIN';
            const blob = new Blob([outputData.data], { type: BINARY_MIME[t] || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `output${BINARY_EXT[t] || '.bin'}`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }
        if (typeof outputData == 'object' && !isDataValue(outputData)) {
            const zip = new JSZip();
            for (const [filename, content] of Object.entries(outputData)) {
                // Each entry can itself be a DataValue or a bare string.
                const payload = isDataValue(content) ? content.data : content;
                zip.file(filename, payload);
            }
            zip.generateAsync({ type: 'blob' }).then((content) => {
                saveAs(content, 'output.zip');
            });
        }
        else {
            const text = isDataValue(outputData) ? (outputData.data ?? '') : outputData;
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `output.txt`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.value);
    };

    return (
        <Paper elevation={1} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }} data-tour="output">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Typography variant="h6">Output</Typography>
                {typeof outputData === 'object' && !Array.isArray(outputData) && !isDataValue(outputData) && Object.keys(outputData).length > 1 && (
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <Select
                            value={selectedFile}
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