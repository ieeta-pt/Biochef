import SaveIcon from '@mui/icons-material/Save';
import { Box, FormControl, IconButton, MenuItem, Paper, Select, TextField, Tooltip, Typography } from '@mui/material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import React, { useEffect, useState } from 'react';

const ToolOutputPanel = ({ outputData, setOutputData, workflow = null, tool = null, inputData, page }) => {
    const [selectedFile, setSelectedFile] = useState('');
    const [displayedOutput, setDisplayedOutput] = useState('');

    // Update displayed output when outputData or selectedFile changes
    useEffect(() => {
        if (typeof outputData === 'object' && !Array.isArray(outputData)) {
            // For object type outputs (multiple files)
            if (Object.keys(outputData).length > 0) {
                // If we have a selected file and it exists in the outputData, use it
                if (selectedFile && outputData[selectedFile]) {
                    setDisplayedOutput(outputData[selectedFile]);
                } else {
                    // Otherwise select the first file
                    const firstKey = Object.keys(outputData)[0];
                    setSelectedFile(firstKey);
                    setDisplayedOutput(outputData[firstKey]);
                }
            } else {
                setDisplayedOutput('');
                setSelectedFile('');
            }
        } else {
            // For string type outputs (single file)
            setDisplayedOutput(outputData);
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
        if (typeof outputData == 'object') {
            const zip = new JSZip();
            for (const [filename, content] of Object.entries(outputData)) {
                zip.file(filename, content);
            }
            zip.generateAsync({ type: 'blob' }).then((content) => {
                saveAs(content, 'output.zip');
            });
        }
        else {
            const blob = new Blob([outputData], { type: 'text/plain;charset=utf-8' });
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
        <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Typography variant="h6">Output</Typography>
                {typeof outputData === 'object' && !Array.isArray(outputData) && Object.keys(outputData).length > 0 && (
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
                    rows={8}
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
                    <IconButton color={'primary'} onClick={handleSaveOutput}>
                        <SaveIcon />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default ToolOutputPanel;