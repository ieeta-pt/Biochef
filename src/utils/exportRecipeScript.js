import description from '../../description.json';
import { detectDataType } from '../utils/detectDataType';

const TypeToExtensionMap = {
    'Multi-FASTA': 'fa',
    'FASTA': 'fa',
    'FASTQ': 'fq',
    'POS': 'pos',
    'SVG': 'svg',
    'NUM': 'num',
    'DNA': 'txt',
    'RNA': 'txt',
    'AminoAcids': 'txt',
    'text': 'txt',
};

export const exportRecipeScript = (workflow, inputData, inputDataType, outputs, exportFileName, showNotification, setOpenExportDialog, returnCommand = false, partialExportIndex = null, tabIndex = 0, selectedFiles = null) => {
    if (workflow.length === 0) {
        showNotification('Cannot export an empty workflow.', 'error');
        return;
    }

    const exportWorkflow = partialExportIndex !== null
        ? workflow.slice(0, partialExportIndex + 1)
        : workflow;

    // Generation of the command line - for all modes
    const inputFile = `input.${TypeToExtensionMap[inputDataType] || 'txt'}`;
    // Use outputs para o último output do workflow
    const lastToolId = exportWorkflow[exportWorkflow.length - 1]?.id;
    const outputContent = outputs?.[lastToolId] || "";
    const outputFile = `output.${TypeToExtensionMap[detectDataType('output.txt', outputContent)] || 'txt'}`;

    const commands = exportWorkflow.map((tool, index) => {
        const toolConfig = description.tools.find((t) => `gto_${tool.toolName}` === t.name);
        if (!toolConfig) return '';

        const flags = toolConfig.flags
            .map((flag) => {
                const flagValue = tool.params[flag.parameter];
                return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
            })
            .filter(Boolean)
            .join(' ');

        const toolCommand = `./gto_${tool.toolName} ${flags}`;
        return index === 0 ? `${toolCommand} < ${inputFile}` : `${toolCommand}`;
    });

    const fullCommand = `${commands.join(' || ')} > ${outputFile}`;

    // If returning the one-line command for "Copy Command" functionality
    if (returnCommand) {
        return fullCommand;
    }

    // Generation of the script
    const scriptLines = ['#!/bin/bash\n\n# Auto-generated Workflow Script'];

    // Step 1: Find or Clone GTO Repository
    scriptLines.push('echo "Searching for the GTO binary directory..."');
    scriptLines.push('GTO_BIN_DIR=$(find / -type d -name "bin" 2>/dev/null | grep "/gto/bin" | head -n 1)');
    scriptLines.push('if [ -z "$GTO_BIN_DIR" ]; then');
    scriptLines.push('  echo "GTO binary directory not found. Cloning GTO repository..."');
    scriptLines.push('  git clone git@github.com:cobilab/gto.git ~/gto || { echo "Failed to clone GTO repository. Exiting."; exit 1; }');
    scriptLines.push('  GTO_BIN_DIR=$(find ~/gto -type d -name "bin" 2>/dev/null | head -n 1)');
    scriptLines.push('fi');
    scriptLines.push('if [ -z "$GTO_BIN_DIR" ]; then');
    scriptLines.push('  echo "Error: GTO binary directory not found even after cloning. Exiting."; exit 1;');
    scriptLines.push('fi');
    scriptLines.push('echo "GTO binary directory found: $GTO_BIN_DIR"\n');

    // Step 2: Display Workflow Summary
    scriptLines.push('echo -e "\\nWorkflow to be executed:"');

    const workflowSummary = exportWorkflow
        .map((tool, index) => {
            const toolConfig = description.tools.find((t) => `gto_${tool.toolName}` === t.name);
            if (!toolConfig) return '';
            const flags = toolConfig.flags
                .map((flag) => {
                    const flagValue = tool.params[flag.parameter];
                    return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
                })
                .filter(Boolean)
                .join(' ');

            const inputRedirection = index === 0 ? '<input_file>' : '';
            return `gto_${tool.toolName} ${flags} ${inputRedirection}`;
        })
        .join(' | '); // Use '|' to pipe the commands

    scriptLines.push(`echo "${workflowSummary}"`);
    scriptLines.push('while true; do');
    scriptLines.push('  echo -n "Do you wish to execute this workflow? (y/n) "');
    scriptLines.push('  read confirm');
    scriptLines.push('  case $confirm in');
    scriptLines.push('    [Yy]* ) break;;');
    scriptLines.push('    [Nn]* ) echo "Exiting..."; exit 0;;');
    scriptLines.push('    * ) echo "Please answer y or n.";;');
    scriptLines.push('  esac');
    scriptLines.push('done\n');

    if (tabIndex === 1 && selectedFiles && selectedFiles.size > 0) {
        // Add the code to handle directory path as argument
        scriptLines.push('# Check if a directory path was provided as an argument');
        scriptLines.push('FILES_DIRECTORY="$1"');
        scriptLines.push('ORIGINAL_DIR=$(pwd)');
        scriptLines.push('');
        scriptLines.push('# Handle directory path');
        scriptLines.push('if [ -n "$FILES_DIRECTORY" ]; then');
        scriptLines.push('  if [ -d "$FILES_DIRECTORY" ]; then');
        scriptLines.push('    echo "Using provided directory: $FILES_DIRECTORY"');
        scriptLines.push('    cd "$FILES_DIRECTORY" || { echo "Error: Cannot access the specified directory"; exit 1; }');
        scriptLines.push('  else');
        scriptLines.push('    echo "Error: The specified directory does not exist: $FILES_DIRECTORY"');
        scriptLines.push('    exit 1');
        scriptLines.push('  fi');
        scriptLines.push('else');
        scriptLines.push('  echo "WARNING: No directory path provided. Using the current directory."');
        scriptLines.push('  echo "You can specify a directory path by running: $0 /path/to/directory"');
        scriptLines.push('fi');
        scriptLines.push('');

        // File Manager Mode: Process each selected file
        scriptLines.push('# Processing multiple input files');
        
        // Collect unique directories from relativePaths
        scriptLines.push('# Creating any necessary directories for output');
        scriptLines.push('mkdir -p output');
        
        const files = Array.from(selectedFiles);
        let processedDirs = new Set();
        
        // Create output directory structure
        files.forEach(file => {
            if (file.relativePath && file.relativePath.includes('/')) {
                const dirPath = file.relativePath.substring(0, file.relativePath.lastIndexOf('/'));
                if (!processedDirs.has(dirPath)) {
                    scriptLines.push(`mkdir -p output/${dirPath}`);
                    processedDirs.add(dirPath);
                }
            }
        });
        
        scriptLines.push('\necho "Starting batch processing of files..."\n');
        scriptLines.push('# Initialize counters for processed and missing files');
        scriptLines.push('processed_files=0');
        scriptLines.push('missing_files=0');
        scriptLines.push('');
        
        // Process each file
        files.forEach(file => {
            const fileExtension = TypeToExtensionMap[file.fileType] || 'txt';
            const outputPath = file.relativePath 
                ? `output/${file.relativePath}` 
                : `output/${file.name}`;

            const filePath = file.relativePath || file.name;

            // Add file existence check
            scriptLines.push(`# Check if file ${filePath} exists`);
            scriptLines.push(`if [ -f "${filePath}" ]; then`);
            scriptLines.push(`  echo "Processing file: ${filePath}"`);
            scriptLines.push(`  # Execute workflow for ${filePath}`);
            
            // First tool with input redirection
            const firstTool = exportWorkflow[0];
            const firstToolConfig = description.tools.find((t) => `gto_${firstTool.toolName}` === t.name);
            const firstToolFlags = firstToolConfig.flags
                .map((flag) => {
                    const flagValue = firstTool.params[flag.parameter];
                    return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && firstTool.params[flag.flag] ? flag.flag : null;
                })
                .filter(Boolean)
                .join(' ');
            
            scriptLines.push(`$GTO_BIN_DIR/gto_${firstTool.toolName} ${firstToolFlags} < "${file.relativePath || file.name}" > temp_output_1.txt`);
            
            // Remaining tools in the chain
            for (let i = 1; i < exportWorkflow.length; i++) {
                const tool = exportWorkflow[i];
                const toolConfig = description.tools.find((t) => `gto_${tool.toolName}` === t.name);
                const toolFlags = toolConfig.flags
                    .map((flag) => {
                        const flagValue = tool.params[flag.parameter];
                        return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
                    })
                    .filter(Boolean)
                    .join(' ');
                
                scriptLines.push(`$GTO_BIN_DIR/gto_${tool.toolName} ${toolFlags} < temp_output_${i}.txt > temp_output_${i+1}.txt`);
            }
            
            // Move final output to its destination
            scriptLines.push(`mv temp_output_${exportWorkflow.length}.txt "${outputPath}_output.${fileExtension}"`);
            scriptLines.push(`echo "Output saved to: ${outputPath}_output.${fileExtension}"\n`);
            scriptLines.push('  processed_files=$((processed_files+1))');
            scriptLines.push('else');
            scriptLines.push(`  echo "WARNING: File '${filePath}' not found. Skipping."`);
            scriptLines.push('  missing_files=$((missing_files+1))');
            scriptLines.push('fi');
            scriptLines.push('');
        });
        
        // Cleanup temp files
        scriptLines.push('# Cleanup temporary files');
        for (let i = 1; i <= exportWorkflow.length; i++) {
            scriptLines.push(`rm -f temp_output_${i}.txt`);
        }

        // Display summary of processed files
        scriptLines.push('\n# Display processing summary');
        scriptLines.push('echo -e "\\nBatch processing completed."');
        scriptLines.push('echo "Files processed: $processed_files"');
        scriptLines.push('echo "Files missing: $missing_files"');
        scriptLines.push('');

        // Add code to return to original directory if it was changed
        scriptLines.push('');
        scriptLines.push('# Return to original directory if it was changed');
        scriptLines.push('if [ -n "$FILES_DIRECTORY" ]; then');
        scriptLines.push('  cd "$ORIGINAL_DIR" || echo "Warning: Could not return to original directory"');
        scriptLines.push('fi');
        
        scriptLines.push('\necho "Batch processing completed."');
    } else {
        // CLI Mode: Use single input
        // Step 3: Request Input File
        const defaultInputFile = `input.${TypeToExtensionMap[inputDataType] || 'txt'}`;
        scriptLines.push(`defaultInputFile="${defaultInputFile}"`);
        scriptLines.push(`echo -e "${inputData.replace(/\n/g, '\\n')}" > "$defaultInputFile"`);
        scriptLines.push('echo -e "\\nDefault input file:"');
        scriptLines.push('file_size=$(wc -c < "$defaultInputFile")');
        scriptLines.push('if [ "$file_size" -gt 300 ]; then');
        scriptLines.push('  head -c 100 "$defaultInputFile"; echo "..."');
        scriptLines.push('else');
        scriptLines.push('  cat "$defaultInputFile"');
        scriptLines.push('fi');

        // Request user input for input file
        scriptLines.push('while true; do');
        scriptLines.push('  echo -n "Do you wish to change the input file? (y/n) "');
        scriptLines.push('  read changeInput');
        scriptLines.push('  case $changeInput in');
        scriptLines.push('    [Yy]* ) break;;');
        scriptLines.push('    [Nn]* ) echo "Using default input file..."; break;;');
        scriptLines.push('    * ) echo "Please answer y or n.";;');
        scriptLines.push('  esac');
        scriptLines.push('done');

        scriptLines.push('if [ "$changeInput" = "y" ]; then');
        scriptLines.push('  echo "Please provide an input file (press Enter to use the default):"');
        scriptLines.push('  read userInputFile');
        scriptLines.push('  if [ -z "$userInputFile" ]; then');
        scriptLines.push('    echo "Using default input file."');
        scriptLines.push('    inputFile="$defaultInputFile"');
        scriptLines.push('  else');
        scriptLines.push('    if [ ! -f "$userInputFile" ]; then');
        scriptLines.push('      echo "Provided file does not exist. Exiting."');
        scriptLines.push('      exit 1');
        scriptLines.push('    fi');
        scriptLines.push('    inputFile="$userInputFile"');
        scriptLines.push('  fi');
        scriptLines.push('else');
        scriptLines.push('  inputFile="$defaultInputFile"');
        scriptLines.push('fi');

        // Step 4: Workflow Execution
        scriptLines.push('echo -e "\\nExecuting the workflow..."');
        scriptLines.push('previousOutput="$inputFile"'); // Initial input
        exportWorkflow.forEach((tool, index) => {
            const toolConfig = description.tools.find((t) => `gto_${tool.toolName}` === t.name);

            if (!toolConfig) {
                console.error(`Tool configuration for ${tool.toolName} not found.`);
                return;
            }
            const outputType = detectDataType('output.txt', outputs?.[tool.id]) || 'text';
            const outputExtension = TypeToExtensionMap[outputType] || 'txt';
            const outputFile = `output_tool_${index + 1}.${outputExtension}`;

            const toolCommand = `$GTO_BIN_DIR/gto_${tool.toolName}`;
            const flags = toolConfig.flags
                .map((flag) => {
                    const flagValue = tool.params[flag.parameter];
                    return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
                })
                .filter(Boolean)
                .join(' ');

            scriptLines.push(`# Step ${index + 1}: ${tool.toolName}`);
            if (flags) {
                scriptLines.push(`echo -e "\\nRunning ${tool.toolName} with flags: ${flags}"`);
            } else {
                scriptLines.push(`echo -e "\\nRunning ${tool.toolName} with no flags"`);
            }
            scriptLines.push(`${toolCommand} ${flags} < "$previousOutput" > "${outputFile}"`);
            scriptLines.push(`echo -e "Output of ${tool.toolName}:"`);
            scriptLines.push(`cat "${outputFile}"`);
            scriptLines.push(`echo -e ""`);
            scriptLines.push(`previousOutput="${outputFile}"`); // Update for the next tool
        });

        scriptLines.push('echo -e "\\nWorkflow execution completed.\\n"');

        // Step 5: Cleanup
        exportWorkflow.forEach((_, index) => {
            const outputType = detectDataType('output.txt', outputs?.[exportWorkflow[index].id]) || 'text';
            const outputExtension = TypeToExtensionMap[outputType] || 'txt';
            scriptLines.push(`rm "output_tool_${index + 1}.${outputExtension}"`);
        });
        scriptLines.push('rm "$defaultInputFile"');
    }

    // Step 6: Create and Download the Script
    const blob = new Blob([scriptLines.join('\n')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${exportFileName}.sh` || 'workflow_script.sh';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Workflow exported successfully!', 'success');
    setOpenExportDialog(false);
};