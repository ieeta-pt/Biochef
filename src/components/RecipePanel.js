// RecipePanel.jsx
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AddCircle, ContentCopy, ExpandLess, ExpandMore, FileUpload, GetApp, HelpOutline, Save, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import React, { useContext, useEffect, useState } from 'react';
import description from '../../description.json';
import { DataTypeContext } from '../contexts/DataTypeContext';
import { NotificationContext } from '../contexts/NotificationContext';
import { ValidationErrorsContext } from '../contexts/ValidationErrorsContext';
import { loadWasmModule } from '../gtoWasm';
import { detectDataType } from '../utils/detectDataType';
import { exportRecipeConfigFile } from '../utils/exportRecipeConfigFile';
import { exportRecipeScript } from '../utils/exportRecipeScript';
import { importRecipeCommand } from '../utils/importRecipeCommand';
import { importRecipeConfigFile } from '../utils/importRecipeConfigFile';
import SortableItem from './SortableItem';

const RecipePanel = ({ workflow, setWorkflow, inputData, setInputData, isLoading, setIsLoading, insertAtIndex, setInsertAtIndex, setAddingATool, setFilteredTools, selectedFiles, setSelectedFiles, tabIndex, setTabIndex, tree, setTree }) => {
  const [activeId, setActiveId] = useState(null);
  const { setDataType, dataType, inputDataType, setInputDataType } = useContext(DataTypeContext); // To update data type context
  const [invalidItemIds, setInvalidItemIds] = useState([]); // To store invalid item IDs
  const [outputMap, setOutputMap] = useState(() => {
    const savedMap = localStorage.getItem('outputMap');
    return savedMap ? JSON.parse(savedMap) : {};
  });
  const { validationErrors, setValidationErrors } = useContext(ValidationErrorsContext); // Access validation errors of parameters
  const [helpMessages, setHelpMessages] = useState({}); // To store help messages for tools
  const [exportFileName, setExportFileName] = useState('my_workflow'); // Default export name
  const [openExportDialog, setOpenExportDialog] = useState(false); // State for export dialog
  const [command, setCommand] = useState('');
  const [openImportDialog, setOpenImportDialog] = useState(false); // State for import dialog
  const [importInput, setImportInput] = useState(''); // State for import input
  const [importError, setImportError] = useState(''); // State for import error
  const [expandedTools, setExpandedTools] = useState(() => {  // Track each tool's expanded state
    const saved = localStorage.getItem('expandedTools');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedOutputs, setExpandedOutputs] = useState({}); // Track each tool's output expanded state
  const [visibleOutputs, setVisibleOutputs] = useState({}); // Track visible outputs
  const [importMode, setImportMode] = useState('command'); // To track the selected import mode
  const [importFile, setImportFile] = useState(null); // To store the uploaded file for import
  const [partialExportIndex, setPartialExportIndex] = useState(null); // To store the index for partial export
  const [deleteOperation, setDeleteOperation] = useState(false); // To store the delete from here state
  const [selectedInput, setSelectedInput] = useState(''); // Tracks selected input

  const outputs = tabIndex === 1 && selectedInput ?
    outputMap[selectedInput] :
    outputMap["ManualInput"];   // Output data for the selected input

  const workflowInput = tabIndex === 0
    ? [{ id: "ManualInput", content: inputData }]
    : Array.from(selectedFiles);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const showNotification = useContext(NotificationContext);

  // Save only ManualInput outputMap in localStorage
  useEffect(() => {
    // Extract only the ManualInput data from the outputMap
    const manualInputData = outputMap["ManualInput"] ? { "ManualInput": outputMap["ManualInput"] } : {};

    // Store only the ManualInput data in localStorage
    localStorage.setItem('outputMap', JSON.stringify(manualInputData));
  }, [outputMap]);

  // Save expandedTools in localStorage
  useEffect(() => {
    localStorage.setItem('expandedTools', JSON.stringify(expandedTools));
  }, [expandedTools]);

  // Update outputMap when selectedFiles change
  useEffect(() => {
    // Build a set of the IDs of the currently selected file inputs
    const selectedFileIds = new Set(
      workflowInput.filter(input => input.id !== "ManualInput").map(input => input.id)
    );

    // Remove keys from outputMap that are not in the selectedFileIds.
    // We keep the "ManualInput" key unchanged.
    setOutputMap((prevMap) => {
      const newMap = { ...prevMap };
      Object.keys(newMap).forEach((inputId) => {
        if (inputId !== "ManualInput" && !selectedFileIds.has(inputId)) {
          delete newMap[inputId];
        }
      });
      return newMap;
    });

    console.log("outputMap: " + JSON.stringify(outputMap));
  }, [selectedFiles]);

  // If a tool is inserted, update data type and outputs mapping
  useEffect(() => {
    const updateDataTypeAndOutputsMapping = async () => {
      setIsLoading(true);

      let input;

      if (tabIndex === 0) {
        input = { id: "ManualInput", content: inputData };
      } else if (selectedInput) {
        input = workflowInput.find(input => input.id === selectedInput);
        if (!input) {
          setIsLoading(false);
          setInsertAtIndex(null);
          return;
        }
      } else {
        setIsLoading(false);
        setInsertAtIndex(null);
        return;
      }

      if (workflow.length > 0) {
        let data = (insertAtIndex !== null && insertAtIndex > 0)
          ? outputMap[input.id]?.[workflow[insertAtIndex - 1].id]
          : input.content;

        for (let i = (insertAtIndex !== null && insertAtIndex > 0) ? insertAtIndex : 0; i < workflow.length; i++) {
          const tool = workflow[i];
          try {
            // Validate parameters
            const isValid = validateParameters(tool, data);
            if (!isValid) {
              setDataType('UNKNOWN');
              break;
            }

            const output = await executeTool(tool, data);
            data = output;

            // Store the output in the map
            setOutputMap((prevMap) => ({
              ...prevMap,
              [input.id]: {
                ...prevMap[input.id],
                [tool.id]: output,
              },
            }));

            // Detect the data type of the output
            const detectedType = detectDataType('output.txt', output);

            if (tool.id === workflow[workflow.length - 1].id && dataType !== detectedType) {
              setDataType(detectedType);
              showNotification(`Data type updated to ${detectedType}`, 'info');
            }
          } catch (error) {
            console.error(`Failed to update data type for tool ${tool.toolName}:`, error);
          }
        }
      } else {
        if (dataType !== inputDataType) {
          setDataType(inputDataType);
          showNotification(`Data type updated to ${inputDataType}`, 'info');
        }
      }

      setIsLoading(false);
      setInsertAtIndex(null);
    };

    // If deleteOperation triggered the useEffect, do not update the data type and outputs mapping
    // The mapping update is done in the handle delete functions
    if (!deleteOperation) {
      updateDataTypeAndOutputsMapping();
    }
    else {
      setDeleteOperation(false);  // Reset the flag
    }

  }, [workflow, inputData, selectedInput, inputDataType]);

  // Run validateParameters when the page is loaded
  useEffect(() => {
    // if (workflow.length > 0) {
    workflow.forEach((tool) => {
      validateParameters(tool);
    });
    // }
  }, [workflow]);

  // State to store help messages for tools
  useEffect(() => {
    workflow.forEach((tool) => {
      if (!helpMessages[tool.toolName]) {
        loadHelpMessage(tool.toolName);
      }
    });

    // console.log('helpMessages ON RECIPEPANEL:', helpMessages);
  }, [workflow]);

  // Export
  useEffect(() => {
    if (openExportDialog && workflow.length > 0) {
      const generatedCommand = exportRecipeScript(
        workflow,
        inputData,
        inputDataType,
        outputs,
        exportFileName,
        showNotification,
        setOpenExportDialog,
        true, // Request the command
        partialExportIndex, tabIndex, selectedFiles);
      setCommand(generatedCommand);
    } else {
      setCommand('');
    }
  }, [openExportDialog, workflow, inputData, inputDataType, outputMap]);

  // Automatically select the first item in availableInputs when it has values
  useEffect(() => {
    if (workflowInput.length > 0 && tabIndex === 1) {
      const selectedInputExists = workflowInput.some(input => input.id === selectedInput);

      if (!selectedInput || !selectedInputExists) {
        setSelectedInput(workflowInput[0].id);
      }
    } else if (tabIndex === 0) {
      // No modo CLI, usar sempre "ManualInput"
      setSelectedInput('');
    }
  }, [workflowInput, tabIndex]);

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
        setHelpMessages((prev) => ({
          ...prev,
          [toolName]: {
            general: generalHelp.trim(),
            flags: flagsHelp, // Store the flags help
          },
        }));
      }
    } catch (error) {
      console.error(`Failed to load help message for ${toolName}: ${error.message}`);
    }
  };

  // Validate the workflow to ensure compatibility between tools
  const validateWorkflow = (workflow, inputDataType) => {
    const firstTool = description.tools.find((t) => `gto_${workflow[0].toolName}` === t.name);
    const firstToolInputFormats = firstTool.input.format.split(',').map(f => f.trim());

    if (firstToolInputFormats[0] !== "" && inputDataType !== "UNKNOWN" && !firstToolInputFormats.includes(inputDataType)) {
      return false;
    }

    for (let i = 0; i < workflow.length - 1; i++) {
      const currentTool = description.tools.find((t) => `gto_${workflow[i].toolName}` === t.name);
      const nextTool = description.tools.find((t) => `gto_${workflow[i + 1].toolName}` === t.name);

      if (!currentTool || !nextTool) {
        return false;
      }

      const currentOutputFormats = currentTool.output.format.split(',').map(f => f.trim());
      const nextInputFormats = nextTool.input.format.split(',').map(f => f.trim());

      // Check if there is a common format between the output of the current tool and the input of the next tool
      const isValid = currentOutputFormats.some((format) => nextInputFormats.includes(format));

      if (!isValid) {
        return false;
      }
    }
    return true;
  };

  // Validate parameters based on expected type
  const validateParameters = (tool) => {
    const toolConfig = description.tools.find((t) => t.name === `gto_${tool.toolName}`);
    const errors = {};

    toolConfig.flags.forEach((flagObj) => {
      const isFlagRequired = flagObj.required;
      const flagValue = !!tool.params[flagObj.flag]; // Check if the flag is active
      const paramValue = tool.params[flagObj.parameter];
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
    if (tool.toolName === 'brute_force_string') {
      const alphabet = tool.params['alphabet'];
      const size = tool.params['size'];
      const max = 250000;

      if (alphabet && size && alphabet.length ** size > max) {
        showNotification('The number of possible combinations is too high. Please reduce the alphabet or the size.', 'error');
        toolConfig.flags.forEach((flagObj) => {
          errors[flagObj.parameter] = 'Number of combinations is too high';
        });
      }
    }

    setValidationErrors((prevErrors) => ({
      ...prevErrors,
      [tool.id]: errors,
    }));

    if (Object.keys(errors).length > 0) {
      showNotification('Please correct the parameters highlighted in red.', 'error');
    }

    return Object.keys(errors).length === 0;
  };


  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const oldIndex = workflow.findIndex((item) => item.id === active.id);
      const newIndex = workflow.findIndex((item) => item.id === over.id);

      const newWorkflow = arrayMove(workflow, oldIndex, newIndex);

      // Validate resulting workflow
      if (validateWorkflow(newWorkflow, inputDataType)) {
        setWorkflow(newWorkflow);
      } else {
        showNotification('Invalid operation: resulting workflow has incompatible steps.', 'error');

        const id = active.id;
        setInvalidItemIds((prev) => [...prev, id]);

        // Remove the highlight after 3 seconds
        setTimeout(() => {
          setInvalidItemIds((prev) => prev.filter((itemId) => itemId !== id));
        }, 3000);
      }
    }
    setActiveId(null);
  };

  const handleDelete = async (id) => {
    setDeleteOperation(true); // Set the flag to avoid updating the data type and outputs mapping in the useEffect

    const newWorkflow = workflow.filter((item) => item.id !== id);

    if (newWorkflow.length === 0) {
      setOutputMap({}); // Clear the output types map
      setHelpMessages({}); // Clear the help messages
      setDataType(inputDataType); // If there's no more items in workflow, reset to input data type
      setValidationErrors({}); // Clear the validation errors
      setWorkflow(newWorkflow);
      showNotification('All operations removed. Data type reset to input type.', 'info');
    } else {

      const toolIndex = workflow.findIndex((t) => t.id === id);
      const isFirstToolWithoutInput = toolIndex === 0 && description.tools.find((tool) => `gto_${workflow[toolIndex].toolName}` === tool.name)?.input?.type === '';

      if (validateWorkflow(newWorkflow, inputDataType) && !isFirstToolWithoutInput) {
        // Remove outputs of the deleted tool for all inputs
        setOutputMap((prevMap) => {
          const newMap = { ...prevMap };
          Object.keys(newMap).forEach((inputName) => {
            if (newMap[inputName]?.[id]) {
              delete newMap[inputName][id]; // Remove the specific tool's output
            }
          });
          return newMap;
        });

        // Execute the tools subsequent to the deleted one to update the outputMap
        let allInputs = workflowInput;
        let previousTool = workflow[toolIndex - 1];

        for (const input of allInputs) {
          let data = previousTool ? outputMap[input.id]?.[previousTool.id] : input.content;

          for (let i = toolIndex; i < newWorkflow.length; i++) {
            const tool = newWorkflow[i];
            const output = await executeTool(tool, data);
            data = output;

            // Store the output in the map
            setOutputMap((prevMap) => ({
              ...prevMap,
              [input.id]: {
                ...prevMap[input.id],
                [tool.id]: output,
              },
            }));
          }
        }

        // Remove the help message for the tool
        setHelpMessages((prev) => {
          const newMessages = { ...prev };
          delete newMessages[workflow[toolIndex].toolName];
          return newMessages;
        });

        // Verify if the tool being removed is the last one, if so, update the data type
        if (toolIndex === newWorkflow.length) {
          const lastTool = newWorkflow[newWorkflow.length - 1];
          let lastOutputType = null;

          // Try using the manual input first
          if (outputMap["ManualInput"]?.[lastTool.id]) {
            lastOutputType = detectDataType('output.txt', outputMap["ManualInput"]?.[lastTool.id]);
          } else {
            // If the manual input doesn't have the output, try using the other inputs
            for (const inputName in outputMap) {
              if (outputMap[inputName]?.[lastTool.id]) {
                lastOutputType = detectDataType('output.txt', outputMap[inputName]?.[lastTool.id]);
                break;
              }
            }
          }

          if (lastOutputType && dataType !== lastOutputType) {
            setDataType(lastOutputType);
            showNotification(`Data type updated to ${lastOutputType}`, 'info');
          }
        }

        // Update validation errors map
        setValidationErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          delete newErrors[id];
          return newErrors;
        });

        setWorkflow(newWorkflow);

      } else {
        setDeleteOperation(false); // Reset the flag because there wasn't any change in the workflow

        showNotification('Invalid operation: resulting workflow has incompatible steps.', 'error');

        setInvalidItemIds((prev) => [...prev, id]);

        // Remove the highlight after 3 seconds
        setTimeout(() => {
          setInvalidItemIds((prev) => prev.filter((itemId) => itemId !== id));
        }, 3000);
      }
    }
  };

  // Delete all operations from the selected tool onwards
  const handleDeleteFromHere = (id) => {
    setDeleteOperation(true); // Set the flag to avoid updating the data type and outputs mapping in the useEffect

    const index = workflow.findIndex((item) => item.id === id);

    if (index !== -1) {
      const newWorkflow = workflow.slice(0, index); // Keep only the operations before the selected one

      if (newWorkflow.length === 0) {
        setOutputMap({});
        setHelpMessages({});
        setDataType(inputDataType);
        setValidationErrors({});
        setWorkflow(newWorkflow);
        showNotification('All operations removed. Data type reset to input type.', 'info');
      } else {
        // Update outputMap to keep only the outputs of the tools that are still in the workflow after slicing
        const newOutputMap = {};

        // Iterate over the inputs
        for (const inputName in outputMap) {
          newOutputMap[inputName] = {};

          // Iterate over the tools in the new workflow
          newWorkflow.forEach((tool) => {
            if (outputMap[inputName]?.[tool.id]) {
              newOutputMap[inputName][tool.id] = outputMap[inputName][tool.id];
            }
          });
        }
        setOutputMap(newOutputMap);

        // Update help messages to keep only the messages of the tools that are still in the workflow after slicing
        const newHelpMessages = {};
        newWorkflow.forEach((tool) => {
          newHelpMessages[tool.toolName] = helpMessages[tool.toolName];
        });
        setHelpMessages(newHelpMessages);

        // Verify if the data type should be updated
        const lastTool = newWorkflow[newWorkflow.length - 1];
        let lastOutputType = null;

        // Try using the manual input first
        if (outputMap["ManualInput"]?.[lastTool.id]) {
          lastOutputType = detectDataType('output.txt', outputMap["ManualInput"]?.[lastTool.id]);
        } else {
          // If the manual input doesn't have the output, try using the other inputs
          for (const inputName in outputMap) {
            if (outputMap[inputName]?.[lastTool.id]) {
              lastOutputType = detectDataType('output.txt', outputMap[inputName]?.[lastTool.id]);
              break;
            }
          }
        }

        if (lastOutputType && dataType !== lastOutputType) {
          setDataType(lastOutputType);
          showNotification(`Data type updated to ${lastOutputType}`, 'info');
        }

        // Update validation errors map
        setValidationErrors((prevErrors) => {
          const newErrors = {};
          newWorkflow.forEach((tool) => {
            newErrors[tool.id] = prevErrors[tool.id];
          });
          return newErrors;
        });

        setWorkflow(newWorkflow);
      }
    }
  };

  const handleParameterChange = (id, name, value) => {
    // Store the index of the tool in the workflow
    const toolIndex = workflow.findIndex((t) => t.id === id);
    setInsertAtIndex(toolIndex);

    const newWorkflow = workflow.map((item) =>
      item.id === id
        ? {
          ...item,
          params: {
            ...item.params,
            [name]: value, // Sets either flag toggle or parameter value
          },
        }
        : item
    );

    setWorkflow(newWorkflow);

    // Validate the parameter value
    validateParameters(newWorkflow[toolIndex]);
  };

  const handleListOperations = (index) => {
    const previous = workflow[index]
    let previousOutputType = null
    if (tabIndex === 0) {
      previousOutputType = detectDataType('output.txt', outputMap["ManualInput"]?.[previous.id]);
    } else {
      previousOutputType = detectDataType('output.txt', outputMap[selectedInput]?.[previous.id]);
    }

    const next = workflow[index + 1]
    const nextTool = description.tools.find((t) => t.name === `gto_${next.toolName}`)
    const nextInputTypes = nextTool.input.format.split(',').map(f => f.trim())

    const filteredOperations = description.tools.filter((tool) => {
      const toolInputTypes = tool.input.format.split(',').map(f => f.trim());
      const toolOutputTypes = tool.output.format.split(',').map(f => f.trim());

      return toolInputTypes.includes(previousOutputType) && toolOutputTypes.some((type) => nextInputTypes.includes(type));
    });

    setAddingATool(true);
    setFilteredTools(filteredOperations);
    setInsertAtIndex(index + 1);
  };

  const handlePartialExport = (stepIndex) => {
    setPartialExportIndex(stepIndex);
    setOpenExportDialog(true);
  };

  const executeTool = async (tool, input) => {
    try {
      // Load the wrapper function dynamically
      const runFunction = await loadWasmModule(tool.toolName);

      // Find tool configuration from description.json
      const toolConfig = description.tools.find(
        (t) => t.name === `gto_${tool.toolName}`
      );
      if (!toolConfig) {
        showNotification(`Configuration for tool ${tool.toolName} not found.`, 'error');
        throw new Error(`Configuration for tool ${tool.toolName} not found.`);
      }

      // Prepare arguments based on tool configuration and user-set parameters
      let args = [];
      if (tool.params && Object.keys(tool.params).length > 0) {
        // Handle flags
        toolConfig.flags.forEach((flagObj) => {
          if (flagObj.required || tool.params[flagObj.flag]) {
            args.push(flagObj.flag);
            // Check if the flag has an associated parameter
            if (
              flagObj.parameter &&
              tool.params[flagObj.parameter] !== undefined &&
              tool.params[flagObj.parameter] !== ''
            ) {
              args.push(`${tool.params[flagObj.parameter]}`);
            }
          }
        });
      }

      // Ensure input is defined
      if (input === undefined || input === null) {
        input = '';
      }

      // Execute the tool
      const outputData = await runFunction(input, args);

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

      // if (outputData.stdout.trim() === '') {
      //   // Notify the user if the output is empty
      //   showNotification('Execution resulted in an empty output.', 'warning');
      // }

      return outputData.stdout;
    } catch (error) {
      console.error(`Failed to execute tool ${tool.toolName}:`, error);
      throw error;
    }
  };

  const handleViewTool = async (tool) => {
    if (visibleOutputs[tool.id]) {
      // Hide output if already visible
      setVisibleOutputs((prev) => ({
        ...prev,
        [tool.id]: false,
      }));
      return;
    }

    // Mark output as visible
    setVisibleOutputs((prev) => ({
      ...prev,
      [tool.id]: true,
    }));
  };

  const handleSaveOutput = async (stopAtIndex) => {
    const endIndex = stopAtIndex !== undefined ? stopAtIndex : workflow.length - 1;

    const allInputs = tabIndex === 0
      ? [{ id: "ManualInput", content: inputData }]
      : Array.from(selectedFiles);

    const exportOutputs = {};

    for (const input of allInputs) {
      let data = input.content;

      for (let i = 0; i <= endIndex && i < workflow.length; i++) {
        const tool = workflow[i];
        try {

          data = await executeTool(tool, data);

          // If it's the last output, store to save it
          if (i === endIndex) {
            exportOutputs[input.id] = data;
          }
        } catch (error) {
          console.error(`Failed to process input ${input.id} with tool ${tool.toolName}:`, error);
          showNotification(`Error processing ${input.id}`, 'error');
        }
      }
    }

    if (Object.keys(exportOutputs).length === 1) {
      const inputFileName = Object.keys(exportOutputs)[0];
      const outputContent = exportOutputs[inputFileName];
      const blob = new Blob([outputContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      if (tabIndex === 0) {
        link.download = `output.txt`;
      } else {
        link.download = `${inputFileName}_output.txt`;
      }
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const zip = new JSZip();
      for (const [inputFileName, outputContent] of Object.entries(exportOutputs)) {
        zip.file(`${inputFileName}_output.txt`, outputContent);
      }
      zip.generateAsync({ type: 'blob' }).then((content) => {
        saveAs(content, 'outputs.zip');
      });
    }
  };

  const toggleExpand = (toolId) => {
    setExpandedTools(prevState => {
      if (prevState.includes(toolId)) {
        return prevState.filter(id => id !== toolId); // Remove toolId if it exists
      } else {
        return [...prevState, toolId]; // Add toolId if it doesn't exist
      }
    });
  };

  const toggleOutputExpand = (toolId) => {
    setExpandedOutputs((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  const renderParameters = (tool) => {
    const toolConfig = description.tools.find((t) => t.name === `gto_${tool.toolName}`);
    if (!toolConfig) return null;

    const toolErrors = validationErrors[tool.id] || {};
    const toolHelp = helpMessages[tool.toolName] || { general: 'Loading help...', flags: {} };
    const flagHelpMessages = toolHelp.flags || {};

    // Filter flags based on required and optionals
    const requiredFlags = toolConfig.flags.filter((flagObj) => flagObj.required && flagObj.flag !== '-h');
    const optionalFlags = toolConfig.flags.filter((flagObj) => !flagObj.required && flagObj.flag !== '-h');

    return (
      <Box sx={{ marginTop: 2 }}>
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
              const flagValue = !!tool.params[flagObj.flag];
              const parameterValue = tool.params[flagObj.parameter] || '';
              const error = toolErrors[flagObj.parameter] || '';

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
                        handleParameterChange(tool.id, flagObj.parameter, e.target.value)
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
          <Box sx={{ marginTop: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                },
                padding: '4px 8px',
                borderRadius: '4px',
              }}
              onClick={() => toggleExpand(tool.id)}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  marginBottom: 1,
                  color: 'text.secondary',
                  flexGrow: 1,
                }}
              >
                Optional Flags
              </Typography>
              {expandedTools.includes(tool.id) ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
            </Box>

            {/* Collapse */}
            <Collapse in={expandedTools.includes(tool.id) || (validationErrors[tool.id] && Object.keys(validationErrors[tool.id]).length > 0)} timeout="auto" unmountOnExit>
              {optionalFlags.map((flagObj) => {
                const flagValue = !!tool.params[flagObj.flag];
                const parameterValue = tool.params[flagObj.parameter] || '';
                const error = toolErrors[flagObj.parameter] || '';

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
                            handleParameterChange(tool.id, flagObj.flag, e.target.checked)
                          }
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
                          handleParameterChange(tool.id, flagObj.parameter, e.target.value)
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
            </Collapse>
          </Box>
        )}
      </Box>
    );
  };


  return (
    <Paper
      elevation={3}
      sx={{ padding: 2, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}
    >
      {/* Box to block interaction */}
      {tabIndex === 1 && selectedFiles.size === 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '88%',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 10,
            pointerEvents: 'all',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Typography variant="body1" color="text.secondary">
            Please select at least one file to work with
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
        <Typography variant="h6" gutterBottom>
          Workflow
        </Typography>
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}
        >
          Current Data Type: {dataType}
        </Typography>
        {/* Dropdown for selecting input source */}
        {tabIndex === 1 && (
          <Select
            value={selectedInput}
            onChange={(e) => setSelectedInput(e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
            displayEmpty
          >
            <MenuItem value="" disabled>
              Inputs
            </MenuItem>
            {workflowInput.map((input) => {
              const maxDisplayLength = 20;
              let displayName;

              if (input.name && input.name.length > maxDisplayLength) {
                const start = input.name.substring(0, maxDisplayLength - 10);
                const end = input.name.substring(input.name.length - 7);
                displayName = `${start}...${end}`;
              } else {
                displayName = input.name || input.id;
              }

              return (
                <MenuItem key={input.id} value={input.id} title={input.name || input.id}>
                  {displayName}
                </MenuItem>
              );
            })}
          </Select>
        )}
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={workflow.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {workflow.map((tool, index) => {
              return (
                <React.Fragment key={tool.id}>
                  <SortableItem
                    id={tool.id}
                    toolName={tool.toolName}
                    onDelete={() => handleDelete(tool.id)}
                    onDeleteFromHere={() => handleDeleteFromHere(tool.id)}
                    isInvalid={invalidItemIds.includes(tool.id)} // Is true if the tool is invalid
                    helpMessage={helpMessages[tool.toolName]?.general}
                    workflowLength={workflow.length}
                    onPartialSave={() => handleSaveOutput(index)}
                  >
                    {renderParameters(tool)}
                    <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 1 }}>
                      <Tooltip title={workflow.slice(0, index + 1).some((prevTool) => validationErrors[prevTool.id] && Object.keys(validationErrors[prevTool.id]).length > 0) ? (
                        <Typography align="center" variant="body2">
                          View output option is unavailable due to errors in the workflow.
                        </Typography>
                      ) : ''
                      }>
                        <span>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            onClick={() => handleViewTool(tool)}
                            startIcon={visibleOutputs[tool.id] ? <VisibilityOff /> : <Visibility />}
                            disabled={workflow.slice(0, index + 1).some((prevTool) => validationErrors[prevTool.id] && Object.keys(validationErrors[prevTool.id]).length > 0)}
                          >
                            {visibleOutputs[tool.id] ? 'Hide' : 'View'}
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                    {outputs?.[tool.id] && visibleOutputs[tool.id] && !(workflow.slice(0, index).some((prevTool) => validationErrors[prevTool.id] && Object.keys(validationErrors[prevTool.id]).length > 0)) && (
                      <Box sx={{ marginTop: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="subtitle2">Output:</Typography>
                          <Button
                            size="small"
                            onClick={() => toggleOutputExpand(tool.id)}
                          >
                            {expandedOutputs[tool.id] ? 'Collapse' : 'Expand'}
                          </Button>
                        </Box>
                        <Collapse in={expandedOutputs[tool.id]} timeout="auto" unmountOnExit>
                          <Paper sx={{ padding: 1, backgroundColor: '#f5f5f5', overflow: 'auto', maxHeight: '200px', wordWrap: 'break-word' }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.800rem' }}>
                              {outputs?.[tool.id]}
                            </Typography>
                          </Paper>
                        </Collapse>
                        {!expandedOutputs[tool.id] && (
                          <Paper sx={{ padding: 1, backgroundColor: '#f5f5f5', overflow: 'auto', maxHeight: '200px', wordWrap: 'break-word' }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.800rem' }}>
                              {outputs?.[tool.id].length > 50 ? `${outputs?.[tool.id].slice(0, 90)}...` : outputs?.[tool.id]}
                            </Typography>
                          </Paper>
                        )}
                      </Box>
                    )}
                  </SortableItem>
                  {/* Add Operation Button */}
                  <Box sx={{ position: 'relative' }}>
                    {/* Overlay to block interaction */}
                    {Object.values(validationErrors).some(error => Object.keys(error).length > 0) && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          backgroundColor: 'rgba(255, 255, 255, 0.7)',
                          zIndex: 10,
                          pointerEvents: 'all',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                      </Box>
                    )}
                    {index < workflow.length - 1 && (
                      <Box
                        sx={{
                          height: '10px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            height: '40px',
                            '& .action-buttons': {
                              opacity: 1,
                              pointerEvents: 'all',
                            },
                          },
                        }}
                      >
                        <Box
                          className="action-buttons"
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: 0,
                            pointerEvents: 'none',
                            transition: 'opacity 0.3s ease',
                          }}
                        >
                          <Tooltip title="Add Tool">
                            <Button
                              color="primary"
                              onClick={() => handleListOperations(index)}
                              sx={{ minWidth: '32px', minHeight: '32px', opacity: 0.8 }}
                            >
                              <AddCircle sx={{ fontSize: '24px' }} />
                            </Button>
                          </Tooltip>
                          <Tooltip title="Export Previous Steps">
                            <Button
                              color="primary"
                              onClick={() => handlePartialExport(index)}
                              sx={{ minWidth: '32px', minHeight: '32px', opacity: 0.8 }}
                            >
                              <GetApp sx={{ fontSize: '24px' }} />
                            </Button>
                          </Tooltip>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </React.Fragment>
              )
            })}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <SortableItem
                id={activeId}
                toolName={workflow.find((item) => item.id === activeId).toolName}
                onDelete={() => { }}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </Box>

      <Divider />

      {workflow.length > 0 && (
        <Box sx={{ marginTop: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <Typography variant="h6" sx={{ paddingBottom: 2 }}>Output</Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 1,
                position: 'absolute',
                bottom: 0,
                right: 0,
              }}
            >
              <Tooltip title="Save Output">
                <IconButton color="primary" onClick={() => handleSaveOutput(workflow.length - 1)}>
                  <Save />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                onClick={() => toggleOutputExpand("OutputBox")}
              >
                {expandedOutputs["OutputBox"] ? 'Collapse' : 'Expand'}
              </Button>
            </Box>
          </Box>
          <Collapse in={expandedOutputs["OutputBox"]} timeout="auto" unmountOnExit>
            <Paper sx={{ padding: 1, backgroundColor: '#f5f5f5', overflow: 'auto', maxHeight: '200px', wordWrap: 'break-word' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.800rem' }}>
                {outputs?.[workflow[workflow.length - 1].id]}
              </Typography>
            </Paper>
          </Collapse>
          {!expandedOutputs["OutputBox"] && (
            <Paper sx={{ padding: 1, backgroundColor: '#f5f5f5', overflow: 'auto', maxHeight: '200px', wordWrap: 'break-word' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.800rem' }}>
                {outputs?.[workflow[workflow.length - 1].id]?.length > 50 ? `${outputs?.[workflow[workflow.length - 1].id].slice(0, 90)}...` : outputs?.[workflow[workflow.length - 1].id]}
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      <Divider sx={{ marginY: 2 }} />

      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, position: 'relative' }}>
        {/* Overlay to block interaction */}
        {(Object.values(validationErrors).some(error => Object.keys(error).length > 0)) || (tabIndex === 1 && selectedFiles.size === 0) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: tabIndex === 1 && selectedFiles.size === 0 ? '50%' : '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 10,
              pointerEvents: 'all',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
          </Box>
        )}
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            if (workflow.length > 0) {
              console.log('Exporting workflow:', workflow);
              setOpenExportDialog(true);
            } else {
              showNotification('Workflow is empty. Cannot export.', 'error');
            }
          }}
          startIcon={<GetApp />}
        >
          Export Recipe
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenImportDialog(true)}
          startIcon={<FileUpload />}
        >
          Import Recipe
        </Button>
      </Box>

      {/* Export Recipe Dialog */}
      <Dialog open={openExportDialog} onClose={() => {
        setOpenExportDialog(false)
        setPartialExportIndex(null)
      }} maxWidth="md" fullWidth>
        <DialogTitle>Export Workflow</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please choose an option to export your workflow:
          </Typography>

          {/* Display command for copying */}
          <Typography variant="subtitle1" gutterBottom>
            Copy Command:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
            <TextField
              fullWidth
              value={command}
              InputProps={{
                readOnly: true,
                sx: { fontSize: '0.875rem' },
              }}
              variant="outlined"
              size="small"
              placeholder="Generate a workflow to see the command here"
            />
            <Tooltip title="Copy to Clipboard">
              <IconButton
                onClick={() => {
                  if (command) {
                    navigator.clipboard.writeText(command).then(() => {
                      showNotification('Command copied to clipboard!', 'success');
                    });
                  } else {
                    showNotification('Workflow is empty. Cannot copy command.', 'error');
                  }
                }}
                color="primary"
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
            {/* File name input */}
            <Typography variant="subtitle1" gutterBottom>
              File Name for Export:
            </Typography>
            <Box sx={{ ml: 'auto' }}>
              {/* Help Tooltip */}
              <Tooltip
                title={
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      <strong>Download Script:</strong> Exports the workflow as a shell script
                      that can be executed in a terminal to reproduce the workflow.
                    </Typography>
                    <Typography variant="body2">
                      <strong>Download Config:</strong> Exports the workflow as a JSON
                      configuration file, useful for sharing or re-importing into the platform.
                    </Typography>
                  </Box>
                }
                arrow
              >
                <IconButton>
                  <HelpOutline />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <TextField
            fullWidth
            margin="dense"
            label="File Name"
            type="text"
            value={exportFileName}
            onChange={(e) => setExportFileName(e.target.value)}
            sx={{ marginBottom: 2, fontSize: '0.875rem' }}
            InputProps={{
              sx: { fontSize: '0.875rem' },
            }}
            InputLabelProps={{
              sx: { fontSize: '0.875rem' },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOpenExportDialog(false);
            setPartialExportIndex(null);
          }} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              exportRecipeScript(
                workflow,
                inputData,
                inputDataType,
                outputs,
                exportFileName,
                showNotification,
                setOpenExportDialog,
                false,
                partialExportIndex, tabIndex, selectedFiles);
              setPartialExportIndex(null);
            }}
            color="primary"
          >
            Download Script
          </Button>
          <Button
            onClick={() => {
              exportRecipeConfigFile(
                workflow,
                inputData,
                inputDataType,
                exportFileName,
                showNotification,
                setOpenExportDialog,
                partialExportIndex,
                tabIndex,
                selectedFiles
              );
              setPartialExportIndex(null);
            }}
            color="primary"
          >
            Download Config
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Recipe Dialog */}
      <Dialog open={openImportDialog} onClose={() => setOpenImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Recipe</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Please choose an option to import your workflow:
          </Typography>

          {/* Tab Navigation for Import Options */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', marginBottom: 2 }}>
            <Tabs
              value={importMode}
              onChange={(e, newValue) => setImportMode(newValue)}
              aria-label="Import options"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab label="Command" value="command" />
              <Tab label="Config File" value="file" />
            </Tabs>
          </Box>

          {/* Import Command */}
          {importMode === 'command' && (
            <Box>
              <TextField
                autoFocus
                margin="dense"
                label="Command"
                type="text"
                fullWidth
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                helperText={importError || 'Enter a valid workflow command.'}
                error={!!importError}
                placeholder="e.g., ./gto_fasta_complement < input.fa || ./gto_fasta_extract -i 0 -e 4 > output.txt"
                InputProps={{
                  sx: { fontSize: '0.875rem' },
                }}
                InputLabelProps={{
                  sx: { fontSize: '0.875rem' },
                }}
                FormHelperTextProps={{
                  sx: { fontSize: '0.75rem' },
                }}
              />
            </Box>
          )}

          {/* Import from File */}
          {importMode === 'file' && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '0.875rem' }}>
                Upload a JSON configuration file to import your workflow.
              </Typography>
              <Button
                variant="contained"
                component="label"
                startIcon={<FileUpload />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Upload File
                <input
                  type="file"
                  hidden
                  accept="application/json"
                  onChange={(e) => setImportFile(e.target.files[0])}
                />
              </Button>
              {importFile && (
                <Typography variant="body2" sx={{ marginTop: 1, fontSize: '0.875rem' }}>
                  Selected file: {importFile.name}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportDialog(false)} color="secondary">
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (importMode === 'command') {
                // Handle import via command
                importRecipeCommand(
                  importInput,
                  setWorkflow,
                  setImportError,
                  setOpenImportDialog,
                  inputDataType,
                  showNotification,
                  validateParameters,
                  validateWorkflow
                );
              } else if (importMode === 'file' && importFile) {
                // Handle import via file
                importRecipeConfigFile(
                  importFile,
                  setWorkflow,
                  setInputData,
                  setInputDataType,
                  showNotification,
                  setOpenImportDialog,
                  setTabIndex,
                  tree,
                  setTree,
                  setSelectedFiles,
                );
              } else {
                showNotification('Please provide a valid input for import.', 'error');
              }
            }}
            color="primary"
            disabled={importMode === 'file' && !importFile && importMode === 'command' && !importInput}
          >
            Import
          </Button>
        </DialogActions>
      </Dialog>

    </Paper >
  );
};

export default RecipePanel;
