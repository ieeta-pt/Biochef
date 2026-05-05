import { Terminal, Upload } from '@mui/icons-material';
import {
    Box,
    Divider,
    Paper,
    Tab,
    Tabs,
    TextField,
    Typography,
    Button,
    Menu,
    MenuItem
} from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { detectDataType } from '../utils/detectDataType';
import { isDataValue, makeText } from '../utils/dataValue';
import FileExplorer from './FileExplorer';
import { TourContext } from '../contexts/TourContext';
import { exampleInputs } from '../utils/exampleInputs';

const InputPanel = ({ tabIndex, setTabIndex, selectedFiles, setSelectedFiles, inputData, setInputData, tree, setTree }) => {
    const showNotification = useContext(NotificationContext);
    const { tourRegisterSteps, tourMoveNext } = useContext(TourContext);
    const { setInputDataType, validateData, inputDataType } = useContext(DataTypeContext);
    const [isValid, setIsValid] = useState(true);
    const [debounceTimer, setDebounceTimer] = useState(null);
    // For rendering: extract text payload; binary inputs get a placeholder string.
    const displayText = (() => {
        if (inputData === undefined || inputData === null) return '';
        if (isDataValue(inputData)) {
            if (inputData.kind === 'binary') {
                const len = inputData.data?.length ?? 0;
                return `[binary ${inputData.type || 'BIN'}, ${len} bytes - pre-loaded, not editable here]`;
            }
            return inputData.data ?? '';
        }
        return inputData;
    })();
    const numberOfLines = displayText.split('\n').length;

    const [selectedExampleFormat, setSelectedExampleFormat] = useState('');

    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        if (tabIndex != 1) return

        if (selectedFiles.size == 0) {
            setInputDataType('UNKNOWN');
            const isEmpty = inputData === '' || (isDataValue(inputData) && (inputData.data?.length ?? 0) === 0);
            if (!isEmpty) setInputData('')
            return
        }

        // File Manager Mode: derive type from selected files.
        const fileTypes = new Set(
            Array.from(selectedFiles).map(file => file.fileType)
        );
        if (fileTypes.size === 1) {
            setInputDataType([...fileTypes][0]);
        } else {
            setInputDataType('UNKNOWN');
        }

        // file.content is now a DataValue ({kind:"text"|"binary"}). Concat-by-newline
        // only makes sense for text. For binary, hand the first selected file's
        // DataValue through unchanged (binary streams aren't line-concatenable).
        const files = Array.from(selectedFiles);
        const anyBinary = files.some(f => isDataValue(f.content) && f.content.kind === 'binary');
        if (anyBinary) {
            const first = files.find(f => isDataValue(f.content) && f.content.kind === 'binary');
            setInputData(first.content);
        } else {
            const joined = files
                .map(f => isDataValue(f.content) ? (f.content.data ?? '') : (f.content ?? ''))
                .join('\n');
            setInputData(joined);
        }
    }, [selectedFiles]);

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

            const detectedType = detectDataType(content);
            setInputDataType(detectedType);
            const valid = validateData(content, detectedType);

            setIsValid(valid);

            if (!valid && detectedType !== 'UNKNOWN') {
                showNotification(`Invalid ${detectedType} data format.`, 'error');
            }
        }, 1000); // 1000ms delay

        setDebounceTimer(timer);
    };

    const handleAddExampleData = (e) => {
        const exampleData = ">seq\nTTGCACTGACCTGAAGTCTTGGAGTATGACCGCGGCTCGGCTCTATCGAACGCTCGATCTAGCGCTATAGGTGGTGCCGAAGGCGGTCTGTCGTCGTA"

        // First, set the example data
        setInputData(exampleData);

        // Simulate the text change logic by calling handleTextChange directly
        // This is like what handleTextChange does after setting inputData
        handleTextChange({
            target: { value: exampleData }
        });

        tourMoveNext();
    };

    useEffect(() => {
        tourRegisterSteps("w-input", [
            {
                element: '[data-tour="input-panel"]',
                popover: {
                    title: "Input",
                    description: "This panel allows you to select the input source for your workflow.",
                },
            },
            {
                element: '[data-tour="input-modes"]',
                popover: {
                    title: "Input Modes",
                    description: "You can choose to input your data either manually or by uploading a file or folder.",
                },
            },
            {
                element: '[data-tour="input-box"]',
                popover: {
                    title: "Input Box",
                    description: "Here, you can type or paste your input data directly into the box.",
                },
            },
            {
                element: '[data-tour="add-example-data"]',
                popover: {
                    title: "Add Example Data",
                    description: "For this tour, let's use some example data to demonstrate the process.",
                    showButtons: ["previous", "exit"],
                },
            },
            {
                element: '[data-tour="input-type"]',
                popover: {
                    title: "Dynamic Input Type",
                    description: "As you enter or select the input data, the input type will automatically adjust to match the format.",
                },
            },
        ]);
    }, []);

    // Cleanup the debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    function handleExampleFormatChange(new_format) {
        setInputData(exampleInputs[new_format])
        setInputDataType(new_format);
        setSelectedExampleFormat(new_format)
    }

    return (
        <Paper data-tour="input-panel" elevation={3} sx={{
            height: '100%', display: 'flex', flexDirection: 'column'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
                <Box data-tour="input-type" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6">Input:</Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ marginLeft: 1 }}>
                        {inputDataType}
                    </Typography>
                </Box>
            </Box>

            <Divider />
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
                <Tabs
                    value={tabIndex}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{
                        borderBottom: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
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

                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    {tabIndex === 0 && (
                        <Box>
                            < Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 2 }}>
                                <Box
                                    sx={{
                                        flexGrow: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        paddingBottom: 2,
                                        // gap: 2,
                                    }}
                                >
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={(e) => setAnchorEl(e.currentTarget)}
                                    >
                                        {'Load Example Input'}
                                    </Button>

                                    <Menu
                                        anchorEl={anchorEl}
                                        open={Boolean(anchorEl)}
                                        onClose={(e) => setAnchorEl(null)}
                                    >
                                        {Object.keys(exampleInputs).map((format) => (
                                            <MenuItem
                                                key={format}
                                                onClick={() => {
                                                    handleExampleFormatChange(format);
                                                    setAnchorEl(null);
                                                }}
                                            >
                                                {format}
                                            </MenuItem>
                                        ))}
                                    </Menu>
                                </Box>

                                <TextField
                                    variant="outlined"
                                    value={displayText}
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
                                    {displayText.length}/100000 characters, {numberOfLines} lines
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {tabIndex === 1 && <FileExplorer selectedFiles={selectedFiles} setSelectedFiles={setSelectedFiles} tree={tree} setTree={setTree} />}
                </Box>
            </Box>

        </Paper >
    );
};

export default InputPanel;