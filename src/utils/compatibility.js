import description from '../../description.json';

/**
 * Checks if fasta_merge_streams should be available based on workflow state
 * @param {Array} workflow - Current workflow array
 * @returns {boolean} - True if fasta_merge_streams should be available
 */
export const isFastaMergeStreamsAvailable = (workflow) => {
  const splitCount = workflow.filter(tool => tool.toolName === 'fasta_split_streams').length;
  const mergeCount = workflow.filter(tool => tool.toolName === 'fasta_merge_streams').length;
  
  // Available if there are more splits than merges (allowing multiple cycles)
  return splitCount > mergeCount;
};

/**
 * Determines which tools are compatible with the current input format.
 * @param {string} currentFormat - The format of the current input data (e.g., "FASTQ").
 * @param {boolean} isWorkflowEmpty - Whether the workflow is empty
 * @param {Array} workflow - Current workflow array for special cases
 * @returns {Array} - An array of tool objects that are compatible.
 */
export const getCompatibleTools = (currentFormat, isWorkflowEmpty, workflow = []) => {
  return description.tools.filter(tool => {
    // Special case for fasta_merge_streams
    if (tool.name === 'gto_fasta_merge_streams') {
      return isFastaMergeStreamsAvailable(workflow);
    }
    
    // Normal compatibility logic
    const isToolInputEmpty = tool.input.format === '';
    return (isToolInputEmpty && isWorkflowEmpty) || tool.input.format.includes(currentFormat);
  });
};