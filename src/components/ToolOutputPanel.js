import SaveIcon from '@mui/icons-material/Save';
import { Box, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import React, { useEffect } from 'react';

const ToolOutputPanel = ({ outputData, setOutputData, workflow = null, tool = null, inputData, page }) => {
    const handleSaveOutput = () => {
        const blob = new Blob([outputData], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'output.txt';
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

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

    return (
        <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Typography variant="h6">Output</Typography>
            </Box>
            {/* TextField with dynamic height */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 2 }}>
                <TextField
                    variant="outlined"
                    value={outputData}
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