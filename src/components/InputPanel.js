import { Terminal, Upload } from '@mui/icons-material';
import {
    Box,
    Divider,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { detectDataType } from '../utils/detectDataType';
import FileExplorer from './FileExplorer';

const InputPanel = ({ tabIndex, setTabIndex, selectedFiles, setSelectedFiles, inputData, setInputData, tree, setTree }) => {
    const showNotification = useContext(NotificationContext);
    const { setInputDataType, validateData, inputDataType } = useContext(DataTypeContext);
    const [isValid, setIsValid] = useState(true);
    const [debounceTimer, setDebounceTimer] = useState(null);

    const numberOfLines = inputData.split('\n').length;

    useEffect(() => {
        if (tabIndex === 1) {
            // File Manager Mode: derive type from selected files.
            // Compute the set of file types from selected files.
            const fileTypes = new Set(
                Array.from(selectedFiles).map(file => file.fileType)
            );
            console.log(selectedFiles);
            // If there's exactly one type, update inputDataType.
            if (fileTypes.size === 1) {
                setInputDataType([...fileTypes][0]);
            } else {
                // Otherwise, either leave it unchanged or set it to a fallback value.
                setInputDataType('UNKNOWN');
            }
        } else {
            setInputDataType(detectDataType("input.txt", inputData))
        }
    }, [tabIndex, selectedFiles, setInputDataType]);

    const handleTabChange = (event, newIndex) => {
        setTabIndex(newIndex);
    };

    const handleTextChange = (e) => {
        const content = e.target.value;
        setInputData(content);

        // Clear existing debounce timer
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        // Set a new debounce timer
        const timer = setTimeout(() => {
            if (content.trim() === '') {
                // If input is empty, reset data type and validation
                setInputDataType('UNKNOWN');
                setIsValid(true); // Treat empty input as valid. Adjust based on requirements
                return;
            }

            const detectedType = detectDataType('input.txt', content);
            setInputDataType(detectedType);
            const valid = validateData(content, detectedType);

            setIsValid(valid);

            if (!valid && detectedType !== 'UNKNOWN') {
                showNotification(`Invalid ${detectedType} data format.`, 'error');
            }
        }, 1000); // 1000ms delay

        setDebounceTimer(timer);
    };

    // Cleanup the debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    return (
        <Paper elevation={3} sx={{
            height: '100%', display: 'flex', flexDirection: 'column'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6">Input:</Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ marginLeft: 1 }}>
                        {inputDataType}
                    </Typography>
                </Box>
            </Box>

            <Divider />

            <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                    borderBottom: 1,
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        minHeight: 64,
                        fontWeight: 'bold',
                    },
                }}
            >
                <Tab
                    icon={<Terminal />}
                    label="CLI Mode"
                    iconPosition="start"
                />
                <Tab
                    icon={<Upload />}
                    label="File Manager"
                    iconPosition="start"
                />
            </Tabs>


            {tabIndex === 0 && (
                <Box>
                    < Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 2 }}>
                        <TextField
                            variant="outlined"
                            value={inputData}
                            onChange={handleTextChange}
                            placeholder="e.g., >Sequence1\nACGT..."
                            InputProps={{
                                multiline: true,
                                inputComponent: 'textarea',
                            }}
                            inputProps={{ maxLength: 100000 }}
                            rows={18}
                            sx={{
                                flexGrow: 1,
                                flexShrink: 1,
                                overflow: 'auto',
                                minHeight: '100px',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: '0.875rem',
                            }}
                            error={!isValid && inputDataType !== 'UNKNOWN'}
                            helperText={!isValid && inputDataType !== 'UNKNOWN' ? `The entered data does not conform to the expected ${inputDataType} format.` : ''}
                        />
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 1,
                            flexShrink: 0,
                            paddingX: 2,
                        }}
                    >
                        <Typography variant="caption" color="textSecondary" sx={{ marginRight: 'auto' }}>
                            {inputData.length}/100000 characters, {numberOfLines} lines
                        </Typography>
                    </Box>
                </Box>
            )}
            {tabIndex === 1 && <FileExplorer selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} tree={tree} setTree={setTree} />}
        </Paper >
    );
};

export default InputPanel;