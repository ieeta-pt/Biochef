import { v4 as uuidv4 } from 'uuid';
import { getTool } from '../utils/toolUtils';

export const importRecipeCommand = (command, setWorkflow, setImportError, setOpenImportDialog, inputDataType, showNotification, validateParameters, validateWorkflow) => {
    try {
        // Split the command into steps
        const steps = command.split(/\|\|?/).map((step) => step.trim());
        if (steps.length === 0) throw new Error('Invalid command: No steps found.');

        let inputFile = null;
        let outputFile = null;

        let newWorkflow = [];

        steps.forEach((step) => {
            // Divides the step into tool and arguments
            const [toolWithPath, ...args] = step.split(/\s+/);
            const toolName = toolWithPath.replace('./', ''); // Extract the tool name
            const toolConfig = getTool(toolName);
            if (!toolConfig) throw new Error(`Tool "${toolName}" is not recognized.`);

            // Initialize the parameters object
            const params = {};

            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                if (arg.startsWith('./')) {
                    throw new Error('Invalid argument: Consecutive tool paths detected.');
                } else if (arg === '<') {
                    // Manipulation of input redirection
                    if (inputFile) throw new Error('Multiple input redirections detected.');
                    i++; // Next argument is the input file
                    if (!args[i]) throw new Error('Missing input file after "<".');
                    inputFile = args[i];
                } else if (arg === '>') {
                    // Manipulation of output redirection
                    if (outputFile) throw new Error('Multiple output redirections detected.');
                    i++; // Next argument is the output file
                    if (!args[i]) throw new Error('Missing output file after ">".');
                    outputFile = args[i];
                } else {
                    // Verify if the argument is a flag
                    const flagObj = toolConfig.flags.find((flag) => flag.flag === arg);

                    if (flagObj) {
                        if (flagObj.parameter) {
                            i++; // Next argument is the parameter value
                            params[flagObj.flag] = true; // Define the flag as active
                            if (!args[i] || ['<', '>', '-'].includes(args[i][0])) {
                                params[flagObj.parameter] = '';
                                i--; // Revert to the previous argument
                            } else {
                                params[flagObj.parameter] = args[i]; // Define the parameter value
                            }
                        }
                    }
                }
            }

            const uniqueId = `${toolName}-${uuidv4()}`;
            const newOperation = {
                id: uniqueId,
                toolName,
                params,
            };

            // Add the new operation to the workflow
            newWorkflow.push(newOperation);
        });

        if (!inputFile) throw new Error('Workflow must include an input file.');
        if (!outputFile) throw new Error('Workflow must include an output file.');

        // Clear the error and close the dialog
        setImportError('');
        setOpenImportDialog(false);

        // Get the input data type of the first tool
        const firstTool = getTool(newWorkflow[0].toolName);
        const firstToolInputTypes = firstTool.input.format.split(',').map(f => f.trim());
        const firstToolInputType = firstToolInputTypes[0] || 'UNKNOWN';

        // Checks if the sequence of tools is valid
        if (validateWorkflow(newWorkflow, firstToolInputType)) {
            let valid = true;
            let validInput = true;

            // Validate each tool parameters
            for (let i = 0; i < newWorkflow.length; i++) {
                const tool = newWorkflow[i];
                if (!validateParameters(tool)) {
                    valid = false;
                    break;
                }
            }

            // Check if the input data type is compatible with the first tool
            if (!firstToolInputTypes.includes(inputDataType)) {
                validInput = false;
            }

            if (valid && validInput) {
                showNotification('Workflow imported successfully!', 'success');
            } else if (!valid && validInput) {
                showNotification('Workflow imported with errors. Please correct the invalid parameters', 'warning');
            } else if (valid && !validInput) {
                showNotification('Workflow imported successfully! Be aware that the input data type may not be compatible with the first tool.', 'warning');
            } else {
                showNotification('Workflow imported with errors. Please correct the invalid parameters and the input data type.', 'warning');
            }

            setWorkflow(newWorkflow);
        } else {
            throw new Error('Invalid workflow: Incompatible steps.');
        }
    } catch (error) {
        setImportError(error.message);
        showNotification(`Failed to import workflow: ${error.message}`, 'error');
    }
};