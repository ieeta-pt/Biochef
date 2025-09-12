import { getTool } from '../utils/toolUtils';
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
        const toolConfig = getTool(tool.toolName);
        if (!toolConfig) return '';

        const flags = toolConfig.flags
            .map((flag) => {
                const flagValue = tool.params[flag.parameter];
                return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
            })
            .filter(Boolean)
            .join(' ');

        const toolCommand = `./${tool.toolName} ${flags}`;
        return index === 0 ? `${toolCommand} < ${inputFile}` : `${toolCommand}`;
    });

    const fullCommand = `${commands.join(' || ')} > ${outputFile}`;

    // If returning the one-line command for "Copy Command" functionality
    if (returnCommand) {
        return fullCommand;
    }

    // Generation of the script
    const scriptLines = ['#!/bin/bash\n\n# Auto-generated Workflow Script'];

    // Create output directory with safety checks
    scriptLines.push('# Create output directory');
    scriptLines.push('OUTPUT_DIR="workflow_output"');
    scriptLines.push('DIR_COUNTER=1');
    scriptLines.push('while [ -d "$OUTPUT_DIR" ]; do');
    scriptLines.push('  OUTPUT_DIR="workflow_output_$DIR_COUNTER"');
    scriptLines.push('  DIR_COUNTER=$((DIR_COUNTER + 1))');
    scriptLines.push('done');
    scriptLines.push('mkdir -p "$OUTPUT_DIR"');
    scriptLines.push('');

    // Create temporary directory for intermediate files
    scriptLines.push('# Create temporary directory for intermediate files');
    scriptLines.push('TEMP_DIR=$(mktemp -d)');
    scriptLines.push('');

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
            const toolConfig = getTool(tool.toolName);
            if (!toolConfig) return '';
            const flags = toolConfig.flags
                .map((flag) => {
                    const flagValue = tool.params[flag.parameter];
                    return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
                })
                .filter(Boolean)
                .join(' ');

            const inputRedirection = index === 0 ? '<input_file>' : '';
            return `${tool.toolName} ${flags} ${inputRedirection}`;
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
        scriptLines.push('OUTPUT_DIR_ABS="$ORIGINAL_DIR/$OUTPUT_DIR"');
        scriptLines.push('');
        scriptLines.push('# Handle directory path or zip file');
        scriptLines.push('if [ -n "$FILES_DIRECTORY" ]; then');
        scriptLines.push('  if [ -d "$FILES_DIRECTORY" ]; then');
        scriptLines.push('    echo "Using provided directory: $FILES_DIRECTORY"');
        scriptLines.push('    cd "$FILES_DIRECTORY" || { echo "Error: Cannot access the specified directory"; exit 1; }');
        // Use all files with the correct extension based on input data type
        scriptLines.push(`    VALID_EXTENSION="${TypeToExtensionMap[inputDataType] || 'txt'}"`);
        scriptLines.push('    FILES_TO_PROCESS=($(ls *.$VALID_EXTENSION 2>/dev/null))');
        scriptLines.push('    if [ ${#FILES_TO_PROCESS[@]} -eq 0 ]; then');
        scriptLines.push('      echo "No .$VALID_EXTENSION files found in the specified directory. Exiting."');
        scriptLines.push('      exit 1');
        scriptLines.push('    fi');
        scriptLines.push('    echo "Found ${#FILES_TO_PROCESS[@]} .$VALID_EXTENSION files in the directory:"');
        scriptLines.push('    for file in "${FILES_TO_PROCESS[@]}"; do');
        scriptLines.push('      echo "  - $file"');
        scriptLines.push('    done');
        scriptLines.push('  elif [ -f "$FILES_DIRECTORY" ] && [[ "$FILES_DIRECTORY" == *.zip ]]; then');
        scriptLines.push('    echo "Extracting zip file: $FILES_DIRECTORY"');
        scriptLines.push('    # Create temporary directory for zip extraction');
        scriptLines.push('    ZIP_TEMP_DIR=$(mktemp -d)');
        scriptLines.push('    # Extract zip file');
        scriptLines.push('    unzip -q "$FILES_DIRECTORY" -d "$ZIP_TEMP_DIR" || { echo "Error: Failed to extract zip file"; rm -rf "$ZIP_TEMP_DIR"; exit 1; }');
        scriptLines.push('    echo "Changing to extracted directory"');
        scriptLines.push('    cd "$ZIP_TEMP_DIR" || { echo "Error: Cannot access the extracted directory"; rm -rf "$ZIP_TEMP_DIR"; exit 1; }');
        scriptLines.push(`    VALID_EXTENSION="${TypeToExtensionMap[inputDataType] || 'txt'}"`);
        scriptLines.push('    FILES_TO_PROCESS=($(ls *.$VALID_EXTENSION 2>/dev/null))');
        scriptLines.push('    if [ ${#FILES_TO_PROCESS[@]} -eq 0 ]; then');
        scriptLines.push('      echo "No .$VALID_EXTENSION files found in the zip file. Exiting."');
        scriptLines.push('      rm -rf "$ZIP_TEMP_DIR"');
        scriptLines.push('      exit 1');
        scriptLines.push('    fi');
        scriptLines.push('    echo "Found ${#FILES_TO_PROCESS[@]} .$VALID_EXTENSION files in the zip:"');
        scriptLines.push('    for file in "${FILES_TO_PROCESS[@]}"; do');
        scriptLines.push('      echo "  - $file"');
        scriptLines.push('    done');
        scriptLines.push('  else');
        scriptLines.push('    echo "Error: The specified path is neither a directory nor a zip file: $FILES_DIRECTORY"');
        scriptLines.push('    exit 1');
        scriptLines.push('  fi');
        scriptLines.push('else');
        scriptLines.push('  echo "WARNING: No directory path provided. Using the current directory."');
        scriptLines.push('  echo "You can specify a directory path by running: $0 /path/to/directory"');
        scriptLines.push('');
        // Add user choice for file selection only when no directory is provided
        scriptLines.push('  # Ask user if they want to use pre-selected files or choose their own');
        scriptLines.push('  echo -e "\\nPre-selected files from the UI:"');
        const files = Array.from(selectedFiles);
        files.forEach(file => {
            scriptLines.push(`  echo "  - ${file.name}"`);
        });
        scriptLines.push('');
        scriptLines.push('  while true; do');
        scriptLines.push('    echo "Do you want to:"');
        scriptLines.push('    echo "1) Use the pre-selected files from the UI"');
        scriptLines.push('    echo "2) Choose your own files from the current directory"');
        scriptLines.push('    read -p "Enter your choice (1 or 2): " file_choice');
        scriptLines.push('    case $file_choice in');
        scriptLines.push('      1)');
        scriptLines.push('        echo "Using pre-selected files from the UI..."');
        scriptLines.push('        FILES_TO_PROCESS=(');
        files.forEach(file => {
            scriptLines.push(`          "${file.name}"`);
        });
        scriptLines.push('        )');
        scriptLines.push('        break;;');
        scriptLines.push('      2)');
        scriptLines.push('        echo "Choose your own files from the current directory:"');
        scriptLines.push('        echo "Available files:"');
        scriptLines.push(`        VALID_EXTENSION="${TypeToExtensionMap[inputDataType] || 'txt'}"`);
        scriptLines.push(`        ls -1 *.$VALID_EXTENSION 2>/dev/null || echo "No .$VALID_EXTENSION files found"`);
        scriptLines.push('        echo "Enter the names of the files you want to process (one per line, press Enter twice when done):"');
        scriptLines.push('        FILES_TO_PROCESS=()');
        scriptLines.push('        while true; do');
        scriptLines.push('          read -p "File name (or press Enter to finish): " file_name');
        scriptLines.push('          if [ -z "$file_name" ]; then');
        scriptLines.push('            break');
        scriptLines.push('          fi');
        scriptLines.push('          if [ -f "$file_name" ]; then');
        scriptLines.push('            FILES_TO_PROCESS+=("$file_name")');
        scriptLines.push('          else');
        scriptLines.push('            echo "File not found: $file_name"');
        scriptLines.push('          fi');
        scriptLines.push('        done');
        scriptLines.push('        if [ ${#FILES_TO_PROCESS[@]} -eq 0 ]; then');
        scriptLines.push('          echo "No files selected. Exiting."');
        scriptLines.push('          exit 1');
        scriptLines.push('        fi');
        scriptLines.push('        break;;');
        scriptLines.push('      *)');
        scriptLines.push('        echo "Invalid choice. Please enter 1 or 2.";;');
        scriptLines.push('    esac');
        scriptLines.push('  done');
        scriptLines.push('fi');
        scriptLines.push('');

        // File Manager Mode: Process each selected file
        scriptLines.push('# Processing input files');

        scriptLines.push('\necho "Starting batch processing of files..."\n');
        scriptLines.push('# Initialize counters for processed and missing files');
        scriptLines.push('processed_files=0');
        scriptLines.push('missing_files=0');
        scriptLines.push('');

        // Process each file
        scriptLines.push('for file in "${FILES_TO_PROCESS[@]}"; do');
        scriptLines.push('  # Check if file exists');
        scriptLines.push('  if [ -f "$file" ]; then');
        scriptLines.push('    echo "Processing file: $file"');
        scriptLines.push('    # Execute workflow for $file');

        // Create temporary directory for this file's processing
        scriptLines.push('    # Create temporary directory for intermediate files');
        scriptLines.push('    TEMP_DIR=$(mktemp -d)');
        scriptLines.push('    echo "Created temporary directory: $TEMP_DIR"');

        // First tool with input redirection
        const firstTool = exportWorkflow[0];
        const firstToolConfig = getTool(firstTool.toolName);
        const firstToolFlags = firstToolConfig.flags
            .map((flag) => {
                const flagValue = firstTool.params[flag.parameter];
                return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && firstTool.params[flag.flag] ? flag.flag : null;
            })
            .filter(Boolean)
            .join(' ');

        if (firstToolConfig.is_multi_output) {
            scriptLines.push('    # First tool is multi-output');
            scriptLines.push('    mkdir -p "$TEMP_DIR/output_tool_1"');
            scriptLines.push(`    $GTO_BIN_DIR/${firstTool.toolName} ${firstToolFlags} < "$file" -l "$TEMP_DIR/output_tool_1"`);
            scriptLines.push('    output_files_1=($(ls "$TEMP_DIR/output_tool_1"))');
        } else {
            scriptLines.push(`    $GTO_BIN_DIR/${firstTool.toolName} ${firstToolFlags} < "$file" > "$TEMP_DIR/temp_output_1.txt"`);
        }

        // Remaining tools in the chain
        for (let i = 1; i < exportWorkflow.length; i++) {
            const tool = exportWorkflow[i];
            const toolConfig = getTool(tool.toolName);
            const toolFlags = toolConfig.flags
                .map((flag) => {
                    const flagValue = tool.params[flag.parameter];
                    return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && tool.params[flag.flag] ? flag.flag : null;
                })
                .filter(Boolean)
                .join(' ');

            const previousTool = exportWorkflow[i - 1];
            const previousToolConfig = getTool(previousTool.toolName);

            if (previousToolConfig.is_multi_output) {
                scriptLines.push(`    # Previous tool was multi-output, processing each file`);
                scriptLines.push(`    mkdir -p "$TEMP_DIR/output_tool_${i + 1}"`);
                scriptLines.push(`    for split_file in "\${output_files_${i}[@]}"; do`);
                if (toolConfig.is_multi_output) {
                    scriptLines.push(`      mkdir -p "$TEMP_DIR/output_tool_${i + 1}/\$split_file"`);
                    scriptLines.push(`      $GTO_BIN_DIR/${tool.toolName} ${toolFlags} < "$TEMP_DIR/output_tool_${i}/\$split_file" -l "$TEMP_DIR/output_tool_${i + 1}/\$split_file"`);
                } else {
                    scriptLines.push(`      $GTO_BIN_DIR/${tool.toolName} ${toolFlags} < "$TEMP_DIR/output_tool_${i}/\$split_file" > "$TEMP_DIR/output_tool_${i + 1}/\$split_file"`);
                }
                scriptLines.push(`    done`);
                scriptLines.push(`    output_files_${i + 1}=($(ls "$TEMP_DIR/output_tool_${i + 1}"))`);
            } else {
                if (toolConfig.is_multi_output) {
                    scriptLines.push(`    # Current tool is multi-output`);
                    scriptLines.push(`    mkdir -p "$TEMP_DIR/output_tool_${i + 1}"`);
                    scriptLines.push(`    $GTO_BIN_DIR/${tool.toolName} ${toolFlags} < "$TEMP_DIR/temp_output_${i}.txt" -l "$TEMP_DIR/output_tool_${i + 1}"`);
                    scriptLines.push(`    output_files_${i + 1}=($(ls "$TEMP_DIR/output_tool_${i + 1}"))`);
                } else {
                    scriptLines.push(`    $GTO_BIN_DIR/${tool.toolName} ${toolFlags} < "$TEMP_DIR/temp_output_${i}.txt" > "$TEMP_DIR/temp_output_${i + 1}.txt"`);
                }
            }
        }

        // Move final output to its destination
        const lastTool = exportWorkflow[exportWorkflow.length - 1];
        const lastToolConfig = getTool(lastTool.toolName);
        const lastToolFlags = lastToolConfig.flags
            .map((flag) => {
                const flagValue = lastTool.params[flag.parameter];
                return flagValue ? `${flag.flag} ${flagValue}` : flag.flag && lastTool.params[flag.flag] ? flag.flag : null;
            })
            .filter(Boolean)
            .join(' ');

        if (lastToolConfig.is_multi_output) {
            scriptLines.push('    # Last tool was multi-output, copying all output files');
            scriptLines.push('    mkdir -p "$OUTPUT_DIR_ABS/$file"');
            scriptLines.push(`    cp -r "$TEMP_DIR/output_tool_${exportWorkflow.length}"/* "$OUTPUT_DIR_ABS/$file/"`);
            scriptLines.push(`    echo "Output saved to: $OUTPUT_DIR_ABS/$file/"`);
        } else {
            // Check if any previous tool was multi-output
            const previousTool = exportWorkflow[exportWorkflow.length - 2];
            const previousToolConfig = getTool(previousTool.toolName);

            if (previousToolConfig.is_multi_output) {
                scriptLines.push('    # Previous tool was multi-output, processing each file');
                scriptLines.push('    mkdir -p "$OUTPUT_DIR_ABS/$file"');
                scriptLines.push(`    for split_file in "\${output_files_${exportWorkflow.length - 1}[@]}"; do`);
                scriptLines.push(`      $GTO_BIN_DIR/${lastTool.toolName} ${lastToolFlags} < "$TEMP_DIR/output_tool_${exportWorkflow.length - 1}/\$split_file" > "$OUTPUT_DIR_ABS/$file/\$split_file"`);
                scriptLines.push('    done');
                scriptLines.push(`    echo "Output saved to: $OUTPUT_DIR_ABS/$file/"`);
            } else {
                const outputType = detectDataType('output.txt', outputs?.[lastTool.id]) || 'text';
                const outputExtension = TypeToExtensionMap[outputType] || 'txt';
                scriptLines.push(`    mkdir -p "$OUTPUT_DIR_ABS/$file"`);
                scriptLines.push(`    mv "$TEMP_DIR/temp_output_${exportWorkflow.length}.txt" "$OUTPUT_DIR_ABS/$file/output.${outputExtension}"`);
                scriptLines.push(`    echo "Output saved to: $OUTPUT_DIR_ABS/$file/output.${outputExtension}"`);
            }
        }

        // Cleanup temporary files for this input
        scriptLines.push('    rm -rf "$TEMP_DIR"');
        scriptLines.push('    processed_files=$((processed_files+1))');
        scriptLines.push('  else');
        scriptLines.push('    echo "WARNING: File $file not found. Skipping."');
        scriptLines.push('    missing_files=$((missing_files+1))');
        scriptLines.push('  fi');
        scriptLines.push('done');

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

        // Add cleanup for zip temporary directory at the end of the script
        scriptLines.push('');
        scriptLines.push('# Cleanup zip temporary directory if it exists');
        scriptLines.push('if [ -n "$ZIP_TEMP_DIR" ] && [ -d "$ZIP_TEMP_DIR" ]; then');
        scriptLines.push('  echo "Cleaning up temporary zip extraction directory..."');
        scriptLines.push('  rm -rf "$ZIP_TEMP_DIR"');
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
        scriptLines.push('previousOutput="$inputFile"');
        exportWorkflow.forEach((tool, index) => {
            const toolConfig = getTool(tool.toolName);
            const isLastTool = index === exportWorkflow.length - 1;

            if (!toolConfig) {
                console.error(`Tool configuration for ${tool.toolName} not found.`);
                return;
            }

            const toolCommand = `$GTO_BIN_DIR/${tool.toolName}`;
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

            if (toolConfig.is_multi_output) {
                // Create output directory for multi-output tools
                const outputDir = isLastTool ? '$OUTPUT_DIR' : '$TEMP_DIR';
                scriptLines.push(`mkdir -p "${outputDir}/output_tool_${index + 1}"`);
                scriptLines.push(`${toolCommand} ${flags} < "$previousOutput" -l "${outputDir}/output_tool_${index + 1}"`);

                // Get list of output files
                scriptLines.push(`output_files_${index + 1}=($(ls "${outputDir}/output_tool_${index + 1}"))`);

                // Process each output file
                scriptLines.push(`for file in "\${output_files_${index + 1}[@]}"; do`);
                scriptLines.push(`  echo -e "\\nProcessing output file \$file:"`);
                scriptLines.push(`  cat "${outputDir}/output_tool_${index + 1}/\$file"`);
                scriptLines.push(`done`);

                // For the next tool, we'll process each file separately
                scriptLines.push(`previousOutput="${outputDir}/output_tool_${index + 1}"`);
            } else {
                // Check if previous tool was multi-output
                const previousTool = index > 0 ? getTool(exportWorkflow[index - 1].toolName) : null;
                if (previousTool && previousTool.is_multi_output) {
                    // Process each file from the previous multi-output tool
                    const outputDir = isLastTool ? '$OUTPUT_DIR' : '$TEMP_DIR';
                    scriptLines.push(`for file in "\${output_files_${index}[@]}"; do`);
                    scriptLines.push(`  echo -e "\\nProcessing file \$file with ${tool.toolName}:"`);
                    scriptLines.push(`  ${toolCommand} ${flags} < "$TEMP_DIR/output_tool_${index}/\$file" > "${outputDir}/output_tool_${index + 1}_\${file}"`);
                    scriptLines.push(`  echo -e "Output for \$file:"`);
                    scriptLines.push(`  cat "${outputDir}/output_tool_${index + 1}_\${file}"`);
                    scriptLines.push(`done`);
                    scriptLines.push(`previousOutput="${outputDir}/output_tool_${index + 1}"`);
                } else {
                    // Single output case
                    const outputType = detectDataType('output.txt', outputs?.[tool.id]) || 'text';
                    const outputExtension = TypeToExtensionMap[outputType] || 'txt';
                    const outputFile = `output_tool_${index + 1}.${outputExtension}`;
                    const outputPath = isLastTool ? '$OUTPUT_DIR' : '$TEMP_DIR';

                    scriptLines.push(`${toolCommand} ${flags} < "$previousOutput" > "${outputPath}/${outputFile}"`);
                    scriptLines.push(`echo -e "Output of ${tool.toolName}:"`);
                    scriptLines.push(`cat "${outputPath}/${outputFile}"`);
                    scriptLines.push(`echo -e ""`);
                    scriptLines.push(`previousOutput="${outputPath}/${outputFile}"`);
                }
            }
        });

        scriptLines.push('echo -e "\\nWorkflow execution completed.\\n"');
        scriptLines.push('echo "Outputs have been saved in directory: $OUTPUT_DIR"');

        // Step 5: Cleanup
        scriptLines.push('# Cleanup temporary files and directory');
        scriptLines.push('rm -rf "$TEMP_DIR"');
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
