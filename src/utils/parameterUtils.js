import { getToolParameters, runTool } from "./toolUtils";

export function validateParameters(toolName, parameters) {
  const errors = {};
  const toolParams = getToolParameters(toolName);

  for (const [paramName, paramData] of Object.entries(parameters)) {
    const paramConfig = toolParams[paramName];
    if (!paramConfig.required && !paramData.enabled) continue

    if (!paramConfig) {
      errors[paramName] = `Parameter "${paramName}" is not part of the tool "${toolName}".`;
      continue;
    }

    // flag only parameters dont have value
    if (paramConfig.type == "flag") continue

    if (paramData.value === undefined || paramData.value === '') {
      errors[paramName] = 'Parameter value cannot be empty.';
      continue;
    }

    if (paramConfig.type === 'integer' && !/^-?\d+$/.test(paramData.value)) {
      errors[paramName] = 'Invalid integer value.';
      continue;
    }

    if (paramConfig.type === 'float' && !/^-?\d+(\.\d+)?$/.test(paramData.value)) {
      errors[paramName] = 'Invalid float value.';
      continue;
    }

    const numericValue = parseFloat(paramData.value);
    if (paramConfig.min !== undefined && numericValue < paramConfig.min) {
      errors[paramName] = `Value must be at least ${paramConfig.min}.`;
    }

    if (paramConfig.max !== undefined && numericValue > paramConfig.max) {
      errors[paramName] = `Value must be at most ${paramConfig.max}.`;
    }

    if (paramConfig.maxLength !== undefined && paramData.value.length > paramConfig.maxLength) {
      errors[paramName] = `Maximum input length is ${paramConfig.maxLength}.`;
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

export async function getToolHelpMessage(toolName) {
  try {
    const result = await runTool(toolName, "", ['-h']);
    const helpLines = result.stdout.split('\n');
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
    return {
      general: generalHelp.trim(),
      flags: flagsHelp, // Store the flags help
    }

  } catch (error) {
    console.error(`Failed to load help message for ${toolName}:`, error);
  }
}