/**
 * Handler for fasta_merge_streams tool integration with fasta_split_streams
 * 
 * This utility handles the special case where fasta_merge_streams needs to:
 * 1. Find the most recent fasta_split_streams output in the workflow
 * 2. Get the original three streams (headers, extra, dna)
 * 3. Replace the selected stream with the current processed data
 * 4. Format the data for the fasta_merge_streams wrapper
 */

/**
 * Handles the execution of fasta_merge_streams tool
 * @param {Object} tool - The current tool object
 * @param {string} input - The current processed input data
 * @param {Array} workflow - The current workflow array
 * @param {Object} outputMap - The output map containing all tool outputs
 * @param {Object} selectedOutputTypes - The selected output types for multi-type tools
 * @param {number} tabIndex - Current tab index (0 for manual, 1 for file mode)
 * @param {string} selectedInput - Currently selected input (for file mode)
 * @param {Function} runFunction - The WASM module run function
 * @returns {Promise<Object>} The output data from fasta_merge_streams
 */
export async function handleFastaMergeStreams(
  tool,
  input,
  workflow,
  outputMap,
  selectedOutputTypes,
  tabIndex,
  selectedInput,
  runFunction
) {
  // Find the most recent unmatched fasta_split_streams in the workflow before this tool
  const currentToolIndex = workflow.findIndex(t => t.id === tool.id);
  let fastaSplitStreamsIndex = -1;
  let fastaSplitStreamsTool = null;
  
  // Go backwards and find the most recent fasta_split_streams that doesn't have a corresponding fasta_merge_streams after it
  for (let i = currentToolIndex - 1; i >= 0; i--) {
    if (workflow[i].toolName === 'fasta_split_streams') {
      // Check if there's a fasta_merge_streams between this split and current position
      let hasMatchingMerge = false;
      for (let j = i + 1; j < currentToolIndex; j++) {
        if (workflow[j].toolName === 'fasta_merge_streams') {
          hasMatchingMerge = true;
          break;
        }
      }
      
      // If no matching merge found, this is our target split
      if (!hasMatchingMerge) {
        fastaSplitStreamsIndex = i;
        fastaSplitStreamsTool = workflow[i];
        break;
      }
    }
  }
  
  if (!fastaSplitStreamsTool) {
    throw new Error('fasta_merge_streams requires an unmatched fasta_split_streams tool earlier in the workflow');
  }

  const inputKey = tabIndex === 0 ? "ManualInput" : selectedInput;
  const fastaSplitOutput = outputMap[inputKey]?.[fastaSplitStreamsTool.id];
  const selectedOutputType = selectedOutputTypes[fastaSplitStreamsTool.id];
  
  if (!fastaSplitOutput || typeof fastaSplitOutput !== 'object') {
    throw new Error('Could not find valid fasta_split_streams output');
  }

  if (!selectedOutputType) {
    throw new Error('No output type selected for fasta_split_streams');
  }

  // Create the file-based input for fasta_merge_streams wrapper
  // Use the original streams from fasta_split_streams
  const streams = {
    headers: fastaSplitOutput.headers || '',
    extra: fastaSplitOutput.extra || '',
    dna: fastaSplitOutput.dna || ''
  };
  
  // Replace the selected stream with the current processed input (most updated)
  if (typeof input === 'string') {
    streams[selectedOutputType] = input;
  }
  
  // Convert streams to the file format expected by the wrapper
  const files = {
    headers: { name: 'HEADERS.JV2', data: streams.headers },
    extra: { name: 'EXTRA.JV2', data: streams.extra },
    dna: { name: 'DNA.JV2', data: streams.dna }
  };
  
  console.log(`fasta_merge_streams: Using file-based input with updated ${selectedOutputType} from fasta_split_streams at index ${fastaSplitStreamsIndex}`);
  
  // Execute fasta_merge_streams with the file-based input (no args needed since using default filenames)
  const outputData = await runFunction(files, []);
  return outputData;
}

/**
 * Checks if a tool is fasta_merge_streams
 * @param {Object} tool - The tool object to check
 * @returns {boolean} True if the tool is fasta_merge_streams
 */
export function isFastaMergeStreams(tool) {
  return tool.toolName === 'fasta_merge_streams';
}