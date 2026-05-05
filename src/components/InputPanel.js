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
import { detectDataType, detectAllDataTypes } from '../utils/detectDataType';
import FileExplorer from './FileExplorer';
import { TourContext } from '../contexts/TourContext';
import CLIInputPanel from './CLIInputPanel';

// const InputPanel = ({ tabIndex, setTabIndex, selectedFiles, setSelectedFiles, inputData, setInputData, tree, setTree }) => {
const InputPanel = ({ 
  inputData, setInputData,
  selectedFiles, setSelectedFiles, tree, setTree
}) => {
  const [inputDataTypes, setInputDataTypes] = useState([])
  const [tabIndex, setTabIndex] = useState(0)

  useEffect(() => {
    const detectedTypes = detectAllDataTypes(inputData);
    setInputDataTypes(detectedTypes);
  }, [inputData]);

  // const showNotification = useContext(NotificationContext);
  // const { tourRegisterSteps, tourMoveNext } = useContext(TourContext);
  // const { setInputDataType, validateData, inputDataType } = useContext(DataTypeContext);
  // const [isValid, setIsValid] = useState(true);
  // const [debounceTimer, setDebounceTimer] = useState(null);
  // const numberOfLines = inputData.split('\n').length;

  // const [selectedExampleFormat, setSelectedExampleFormat] = useState('');

  // const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
      if (tabIndex != 1) return

      if (selectedFiles.size == 0) {
          setInputDataTypes([]);
          if (inputData != '') setInputData('')
          return
      }

      // NOTE(andrade)
      // Not sure if concatenating the files is the correct thing to do
      // Maybe we want to limit to one selected file at a time
      setInputData(Array.from(selectedFiles).map(f => f.content).join('\n'));
  }, [selectedFiles]);

  // const handleTabChange = (event, newIndex) => {
  //     setTabIndex(newIndex);
  // };

  // const handleTextChange = (e) => {
  //     const content = e.target.value;
  //     setInputData(content);

  //     // Clear existing debounce timer
  //     if (debounceTimer) {
  //         clearTimeout(debounceTimer);
  //     }

  //     // Set a new debounce timer
  //     const timer = setTimeout(() => {
  //         if (content.trim() === '') {
  //             // If input is empty, reset data type and validation
  //             setInputDataType('UNKNOWN');
  //             setIsValid(true); // Treat empty input as valid. Adjust based on requirements
  //             return;
  //         }

  //         const detectedType = detectDataType(content);
  //         setInputDataType(detectedType);
  //         const valid = validateData(content, detectedType);

  //         setIsValid(valid);

  //         if (!valid && detectedType !== 'UNKNOWN') {
  //             showNotification(`Invalid ${detectedType} data format.`, 'error');
  //         }
  //     }, 1000); // 1000ms delay

  //     setDebounceTimer(timer);
  // };

  // const handleAddExampleData = (e) => {
  //     const exampleData = ">seq\nTTGCACTGACCTGAAGTCTTGGAGTATGACCGCGGCTCGGCTCTATCGAACGCTCGATCTAGCGCTATAGGTGGTGCCGAAGGCGGTCTGTCGTCGTA"

  //     // First, set the example data
  //     setInputData(exampleData);

  //     // Simulate the text change logic by calling handleTextChange directly
  //     // This is like what handleTextChange does after setting inputData
  //     handleTextChange({
  //         target: { value: exampleData }
  //     });

  //     tourMoveNext();
  // };

  // useEffect(() => {
  //     tourRegisterSteps("w-input", [
  //         {
  //             element: '[data-tour="input-panel"]',
  //             popover: {
  //                 title: "Input",
  //                 description: "This panel allows you to select the input source for your workflow.",
  //             },
  //         },
  //         {
  //             element: '[data-tour="input-modes"]',
  //             popover: {
  //                 title: "Input Modes",
  //                 description: "You can choose to input your data either manually or by uploading a file or folder.",
  //             },
  //         },
  //         {
  //             element: '[data-tour="input-box"]',
  //             popover: {
  //                 title: "Input Box",
  //                 description: "Here, you can type or paste your input data directly into the box.",
  //             },
  //         },
  //         {
  //             element: '[data-tour="add-example-data"]',
  //             popover: {
  //                 title: "Add Example Data",
  //                 description: "For this tour, let's use some example data to demonstrate the process.",
  //                 showButtons: ["previous", "exit"],
  //             },
  //         },
  //         {
  //             element: '[data-tour="input-type"]',
  //             popover: {
  //                 title: "Dynamic Input Type",
  //                 description: "As you enter or select the input data, the input type will automatically adjust to match the format.",
  //             },
  //         },
  //     ]);
  // }, []);

  // // Cleanup the debounce timer on unmount
  // useEffect(() => {
  //     return () => {
  //         if (debounceTimer) {
  //             clearTimeout(debounceTimer);
  //         }
  //     };
  // }, [debounceTimer]);

  // function handleExampleFormatChange(new_format) {
  //     setInputData(exampleInputs[new_format])
  //     setInputDataType(new_format);
  //     setSelectedExampleFormat(new_format)
  // }

  return (
    <Paper elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 2, flexShrink: 0 }}>
        <Box data-tour="input-type" sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6">Input:</Typography>
          <Typography variant="body1" color="textSecondary" sx={{ marginLeft: 1 }}>
            {inputDataTypes.join(', ')}
          </Typography>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(e, newIndex) => { setTabIndex(newIndex) }}
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
            <CLIInputPanel
              inputData={inputData}
              setInputData={setInputData}
            />
          )}

          {tabIndex === 1 && (
            <FileExplorer
              selectedFiles={selectedFiles} 
              setSelectedFiles={setSelectedFiles} 
              tree={tree} 
              setTree={setTree} 
            />
          )}
        </Box>
      </Box>

    </Paper >
  );
};

export default InputPanel;