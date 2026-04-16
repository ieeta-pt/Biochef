import UploadIcon from '@mui/icons-material/Upload';
import { Box, IconButton, MenuItem, Paper, Select, TextField, Tooltip, Typography } from '@mui/material';
import React, { useContext, useEffect, useState } from 'react';
import { getTool } from '../utils/toolUtils';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { detectDataType } from '../utils/detectDataType';
import { TourContext } from '../contexts/TourContext';

const ToolInputPanel = ({ tool, inputData, setInputData }) => {
    const [fileName, setFileName] = useState('');
    const showNotification = useContext(NotificationContext);
    const { setInputDataType, validateData, inputDataType } = useContext(DataTypeContext);
    const [isValid, setIsValid] = useState(true);
    const [isAcceptable, setIsAcceptable] = useState(true);
    const [toolInputFormat, setToolInputFormat] = useState([]);
    const [selectedInputFormat, setSelectedInputFormat] = useState('');
    const [selectedInput, setSelectedInput] = useState('');

    const toolConfig = tool ? getTool(tool.name) : null
    const toolInputs = toolConfig ? toolConfig.io.inputs : []

    // Define acceptable file extensions
    const acceptableExtensions = ['.fasta', '.fa', '.fastq', '.fq', '.pos', '.svg', '.txt', '.num'];

    // Get the input formats supported by the tool
    useEffect(() => {
        if (tool) {
            // Update the input format based on the selected tool
            const inputFormats = toolConfig.inputTypes;
            setToolInputFormat(inputFormats);

            // Reset input format and data if the tool changes
            if (inputFormats.length !== toolInputFormat.length || !(inputFormats.every((value, index) => value === toolInputFormat[index]))) {
                setSelectedInputFormat({});
                setInputData({});
            }

            if (toolInputs.length > 0) {
                setSelectedInput(toolInputs[0]);
            }
        }
    }, [tool]);


    // Example inputs for supported formats
    const exampleInput = {
        "FASTA": ">seq\nTTGCACTGACCTGAAGTCTTGGAGTATGACCGCGGCTCGGCTCTATCGAACGCTCGATCTAGCGCTATAGGTGGTGCCGAAGGCGGTCTGTCGTCGTA",
        "Multi-FASTA": ">seq1\nGTTCCAGTAGCGGCGTATCGTAGGTGACGTAGCAGTCGATCGCTAGCGAAGCGCTGACTAGCTCGATAGCGGCTACTCGTACGTAGTACGTAGCATACG\n>seq2\nAGCTGCTGATCGTGATCGAGCTCGATGCATCGATCGCTAGCGTACGTAGCTGACGTAGCGTGACTGATCGTAGCTGATCGTGACGTAGCTGACGTAGCTG",
        "FASTQ": "@seq\nGCTAGCTGATCGTACGTAGCGTATCGTAGCTGATCGTACGATCGTAGCTAGCTGATCGTAGCTAGCTAGCTGATCGTAGCTAGCTGATCGTACGTAGC\n+\n!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~!!!!!",
        "DNA": "CGTACGTAGCTGACTGATCGTAGCTAGCTGACTGACTAGCTGATCGTAGCTGATCGTACGTAGCTAGCTAGCTGACTAGCTGATCGTACGTAGCTGAC",
        "RNA": "CGUACGUAGCUGACUGAUCGAUGCUACGUAGCUGACGUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUAGCUA",
        "AminoAcids": "ACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTVWYACDEFGHIKLMNPQRSTV",
        "NUM": "0.123\n3.432\n2.341\n1.323\n7.538\n4.122\n0.242\n0.654\n5.633",
        "SVG": "<svg width='100' height='100'><rect width='100' height='100' style='fill:rgb(0,0,255);stroke-width:3;stroke:rgb(0,0,0)' /></svg>",
        "PackagedFASTQ": "GATTTGGGGTTCAAAGCAGTATCGATCAAATAGTAAATCCATTTGTTCAACTCACAGTTT!''*((((***+))%%%++)(%%%%).1***-+*''))**55CCF>>>>>>CCCCCCC6SEQ_ID+	0"
    };

    const updateSelectedInputData = (data) => {
        setInputData(prev => ({
            ...prev,
            [selectedInput.name]: data
        }));
    }

    const updateSelectedInputFormat = (fomat) => {
        setSelectedInputFormat(prev => ({
            ...prev,
            [selectedInput.name]: fomat
        }));
    }

    const handleInputFormatChange = (format) => {
        updateSelectedInputFormat(format);

        const example_input = exampleInput[format] || ''
        updateSelectedInputData(example_input); // Load example input if available
    };

    // Debounce state
    const [debounceTimer, setDebounceTimer] = useState(null);

    const processFileContent = (file, content, isPartial) => {
        const lines = isPartial ? content.split('\n').slice(0, 100).join('\n') : content;
        updateSelectedInputData(lines);

        const detectedType = detectDataType(file.name, lines);
        setInputDataType(detectedType);
        const valid = validateData(lines, detectedType);
        setIsValid(valid);

        if (!valid && detectedType !== 'UNKNOWN') {
            showNotification(`Invalid ${detectedType} data format.`, 'error');
        } else if (isPartial) {
            showNotification("Processing the first 100 lines of the file.", 'success');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const extension = `.${file.name.split('.').pop().toLowerCase()}`;
            if (!acceptableExtensions.includes(extension)) {
                showNotification(`Unsupported file type: ${extension}`, 'error');
                setIsAcceptable(false);
                setFileName('');
                setInputData({});
                setIsValid(false);
                setInputDataType('UNKNOWN'); // Reset data type
                return;
            }

            const fileSizeLimit = 100 * 1024 * 1024; // 100 MB in bytes
            const isPartial = file.size > fileSizeLimit;
            if (isPartial) {
                showNotification("Uploaded file is too large. Only the first 100 lines will be processed.", 'warning');
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                processFileContent(file, content, isPartial);
            };
            reader.onerror = (e) => {
                console.error('Error reading file:', e);
                showNotification('Failed to read the file.', 'error');
            };

            // if file size is too large, read only the first 100 MB
            if (isPartial) {
                reader.readAsText(file.slice(0, fileSizeLimit));
            } else {
                reader.readAsText(file);
            }
        }
    };

    const handleSelectedInputChange = (inputName) => {
        const selected = toolInputs.find(
            (input) => input.name === inputName
        );
        setSelectedInput(selected);
    }

    const handleTextChange = (content) => {
        updateSelectedInputData(content)

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

    // Cleanup the debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    return (
        <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: 2,
                }}
            >
                <Typography variant="h6">Input</Typography>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        minWidth: 200,
                    }}
                >
                    <Select
                        value={selectedInputFormat[selectedInput.name] || ''}
                        onChange={(e) => handleInputFormatChange(e.target.value)}
                        displayEmpty
                        fullWidth
                        size="small"
                    >
                        <MenuItem value="" disabled>
                            Select Example Format
                        </MenuItem>
                        {toolInputFormat.map((format) => (
                            <MenuItem key={format} value={format}>
                                {format}
                            </MenuItem>
                        ))}
                    </Select>

                    {toolInputs.length > 1 && selectedInput && (
                        <Select
                            value={selectedInput?.name || ''}
                            onChange={(e) => handleSelectedInputChange(e.target.value)}
                            displayEmpty
                            fullWidth
                            size="small"
                        >
                            <MenuItem value="" disabled>
                                Select Input
                            </MenuItem>
                            {toolInputs.map((input) => (
                                <MenuItem key={input.name} value={input.name}>
                                    {input.name}
                                </MenuItem>
                            ))}
                        </Select>
                    )}

                </Box>
            </Box>
            {/* TextField with dynamic height */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 2 }}>
                <TextField
                    variant="outlined"
                    value={inputData[selectedInput.name] || ''}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="e.g., >Sequence1\nACGT..."
                    InputProps={{
                        multiline: true,
                        inputComponent: 'textarea',
                    }}
                    inputProps={{ maxLength: 100000 }}
                    rows={9}
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
                }}
            >
                <Typography variant="body2" color="textSecondary">
                    {(inputData[selectedInput.name]?.length || 0)}/100000 characters, {(inputData[selectedInput.name]?.split('\n').length || 0)} lines
                </Typography>
                <Tooltip title="Upload File">
                    <IconButton
                        color="primary"
                        component="label"
                        sx={{
                            padding: '6px',
                            backgroundColor: isAcceptable ? 'primary.main' : 'grey.500',
                            '&:hover': {
                                backgroundColor: isAcceptable ? 'primary.dark' : 'grey.500',
                            },
                            cursor: isAcceptable ? 'pointer' : 'not-allowed',
                            color: 'white',
                        }}
                        disabled={!isAcceptable}
                        data-tour="import-input"
                    >
                        <UploadIcon fontSize="small" />
                        <input
                            type="file"
                            hidden
                            accept={acceptableExtensions.join(',')}
                            onChange={handleFileUpload}
                        />
                    </IconButton>
                </Tooltip>
            </Box>
        </Paper>
    );
};

export default ToolInputPanel;
