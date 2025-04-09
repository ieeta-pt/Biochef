#!/bin/bash

# Don't exit immediately on error
set +e

# Get the directory of the script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# Check if EMSDK_PATH is set as an environment variable
if [[ -z "$EMSDK_PATH" ]]; then
    echo "Error: EMSDK_PATH is not set. Please configure it before running the script."
    exit 1
fi

# Ensure Emscripten is in the PATH
source "$EMSDK_PATH/emsdk_env.sh"

# Path to description.json
DESCRIPTION_FILE="$SCRIPT_DIR/description.json"

# Ensure description.json exists
if [[ ! -f "$DESCRIPTION_FILE" ]]; then
    echo "Error: description.json not found at $DESCRIPTION_FILE"
    exit 1
fi

# Ensure public/wasm directory exists
WASM_DIR="$SCRIPT_DIR/public/wasm"
mkdir -p "$WASM_DIR"

# Single log file for all compilations
MAIN_LOG_FILE="$WASM_DIR/compilation_log.txt"
echo "Compilation Log" > "$MAIN_LOG_FILE"
echo "=================" >> "$MAIN_LOG_FILE"

# Create and activate a virtual environment
VENV_DIR="$SCRIPT_DIR/venv"
if [[ ! -d "$VENV_DIR" ]]; then
    echo "Creating virtual environment..." | tee -a "$MAIN_LOG_FILE"
    python3 -m venv "$VENV_DIR" >> "$MAIN_LOG_FILE" 2>&1
    if [[ $? -ne 0 ]]; then
        echo "Error creating virtual environment. Check $MAIN_LOG_FILE for details."
        exit 1
    fi
fi

echo "Activating virtual environment..." | tee -a "$MAIN_LOG_FILE"
source "$VENV_DIR/bin/activate"

# Install Python dependencies
echo "Installing Python dependencies..." | tee -a "$MAIN_LOG_FILE"
pip install -r "$SCRIPT_DIR/requirements.txt" >> "$MAIN_LOG_FILE" 2>&1
if [[ $? -ne 0 ]]; then
    echo "Error installing Python dependencies. Check $MAIN_LOG_FILE for details."
    exit 1
fi

# Compile common source files
common_sources="argparse.c buffer.c common.c csmodel.c dna.c fcm.c labels.c mem.c misc.c parser.c phash.c reads.c"
common_objects=""

echo "Compiling common source files..." | tee -a "$MAIN_LOG_FILE"

for file in $common_sources; do
    obj_file="${file%.c}.o"
    echo "Compiling $file..." | tee -a "$MAIN_LOG_FILE"
    emcc -c "$SCRIPT_DIR/gto/src/$file" -o "$obj_file" -I"$SCRIPT_DIR/gto/src" -O3 -Wall -ffast-math -DLINUX >> "$MAIN_LOG_FILE" 2>&1
    if [[ $? -ne 0 ]]; then
        echo "Error compiling $file. Check $MAIN_LOG_FILE for details."
        exit 1
    fi
    common_objects+=" $obj_file"
done

# Compile Additional Objects for Comparative Mapping
additional_cmap_sources="common-cmap.c mem-cmap.c msg-cmap.c paint-cmap.c time-cmap.c"
additional_cmap_objects=""

echo "Compiling additional Comparative Mapping source files..." | tee -a "$MAIN_LOG_FILE"

for file in $additional_cmap_sources; do
    obj_file="${file%.c}.o"
    echo "Compiling $file..." | tee -a "$MAIN_LOG_FILE"
    emcc -c "$SCRIPT_DIR/gto/src/$file" -o "$obj_file" -I"$SCRIPT_DIR/gto/src" -O3 -Wall -ffast-math -DLINUX >> "$MAIN_LOG_FILE" 2>&1
    if [[ $? -ne 0 ]]; then
        echo "Error compiling $file. Check $MAIN_LOG_FILE for details."
        exit 1
    fi
    additional_cmap_objects+=" $obj_file"
done

compiled_programs=0
failed_programs=0
declare -a failed_list

tool_count=$(jq '.tools | length' "$DESCRIPTION_FILE")
total_programs=0

for ((i=0; i<tool_count; i++)); do
    tool=$(jq ".tools[$i]" "$DESCRIPTION_FILE")
    prog=$(echo "$tool" | jq -r '.name')
    source_file=$(echo "$tool" | jq -r '.source // empty')  # Use // empty to avoid null
    input_type=$(echo "$tool" | jq -r '.input.type // "unknown"')
    output_type=$(echo "$tool" | jq -r '.output.type // "unknown"')
    is_multi_output=$(echo "$tool" | jq -r '.is_multi_output // false')

    if [[ -z "$source_file" ]]; then
        echo "Skipping $prog: no source file specified." | tee -a "$MAIN_LOG_FILE"
        continue
    fi
    # Remove 'gto_' prefix for module name
    module_name="${prog#gto_}"

    full_source_path="$SCRIPT_DIR/$source_file"

    total_programs=$((total_programs + 1))

    echo "Processing ${prog} (${source_file})..." | tee -a "$MAIN_LOG_FILE"
    echo "Compiling ${prog}..." | tee -a "$MAIN_LOG_FILE"

    if [[ -f "$full_source_path" ]]; then
        output_js="$WASM_DIR/${module_name}.js"
        compile_log="$WASM_DIR/${module_name}_compile.log"

        # Define compilation flags as an array (updated)
        emcc_flags=(
            -O3
            -Wall
            -ffast-math
            -DPROGRESS
            -DLINUX
            -I"$SCRIPT_DIR/gto/src"
            -sWASM=1
            -sALLOW_MEMORY_GROWTH=1
            -sMODULARIZE=1
            -sEXPORT_NAME="$module_name"
            -sENVIRONMENT=web,worker
            -sEXPORTED_FUNCTIONS='["_main","_real_main","_malloc","_free"]'
            -sEXPORTED_RUNTIME_METHODS='["ccall","cwrap","FS","setValue","stringToUTF8","callMain"]'
            -sEXIT_RUNTIME=1   # Add this line
        )

        # Determine which object files to link
        if [[ "$prog" == "gto_comparative_map" ]]; then
            link_objects="$additional_cmap_objects"
        else
            link_objects="$common_objects"
        fi

        # Create post.js to assign module factory to window
        post_js_content="window['$module_name'] = $module_name;"
        echo "$post_js_content" > "$WASM_DIR/${module_name}_post.js"

        # Create a temporary copy of the source file
        temp_source="$SCRIPT_DIR/gto/src/temp_${module_name}.c"
        cp "$full_source_path" "$temp_source"

        # Replace 'main' with 'real_main' in the temporary source file
        sed -i 's/\bmain\b/real_main/g' "$temp_source"

        # Compile the temp source file with main_wrapper.c
        emcc "${emcc_flags[@]}" "$temp_source" "$SCRIPT_DIR/gto/src/main_wrapper.c" $link_objects -o "$output_js" -lm \
            --post-js "$WASM_DIR/${module_name}_post.js" >> "$compile_log" 2>&1

        # Remove the temporary source file
        rm -f "$temp_source"

        if [[ $? -eq 0 ]]; then
            echo "Successfully compiled ${module_name}." | tee -a "$MAIN_LOG_FILE"
            compiled_programs=$((compiled_programs + 1))

            # Generate the wrapper script
            echo "Generating wrapper for ${module_name} with input_type='${input_type}' and output_type='${output_type}'..." | tee -a "$MAIN_LOG_FILE"
            python "$SCRIPT_DIR/generate_wrapper.py" "$module_name" "$input_type" "$output_type" "$is_multi_output" >> "$MAIN_LOG_FILE" 2>&1

            # Verify if wrapper was generated successfully
            wrapper_file="$WASM_DIR/${module_name}_wrapper.js"
            if [[ -f "$wrapper_file" ]]; then
                echo "Wrapper generated successfully at $wrapper_file" | tee -a "$MAIN_LOG_FILE"
            else
                echo "Error: Wrapper file $wrapper_file was not created." | tee -a "$MAIN_LOG_FILE"
                failed_programs=$((failed_programs + 1))
                failed_list+=("$module_name (Wrapper generation failed)")
            fi
        else
            failed_programs=$((failed_programs + 1))
            failed_list+=("$module_name")
            echo "Failed to compile ${module_name}. Check $compile_log for details." | tee -a "$MAIN_LOG_FILE"

            # Extract and display relevant error messages
            echo "Analyzing compilation errors for ${module_name}..." | tee -a "$MAIN_LOG_FILE"
            if grep -q "error:" "$compile_log"; then
                echo "Compilation errors found:" | tee -a "$MAIN_LOG_FILE"
                grep "error:" "$compile_log" | head -n 5 | tee -a "$MAIN_LOG_FILE"
            elif grep -q "undefined symbol" "$compile_log"; then
                echo "Linker errors found (undefined symbols):" | tee -a "$MAIN_LOG_FILE"
                grep "undefined symbol" "$compile_log" | head -n 5 | tee -a "$MAIN_LOG_FILE"
            else
                echo "Unknown compilation error. Please check the log file." | tee -a "$MAIN_LOG_FILE"
            fi
        fi
    else
        failed_programs=$((failed_programs + 1))
        failed_list+=("$module_name")
        echo "Warning: Source file '$full_source_path' not found for program '$module_name'." | tee -a "$MAIN_LOG_FILE"
    fi

    echo "----------------------------------------" | tee -a "$MAIN_LOG_FILE"
done

# Clean up object files
echo "Cleaning up object files..." | tee -a "$MAIN_LOG_FILE"
rm -f *.o

# Summary
echo -e "\n---------------------------------------------" | tee -a "$MAIN_LOG_FILE"
echo "Compilation complete!" | tee -a "$MAIN_LOG_FILE"
echo "Total programs: $total_programs" | tee -a "$MAIN_LOG_FILE"
echo "Successfully compiled: $compiled_programs" | tee -a "$MAIN_LOG_FILE"
echo "Failed to compile: $failed_programs" | tee -a "$MAIN_LOG_FILE"

if [[ ${#failed_list[@]} -gt 0 ]]; then
    echo -e "\nFailed programs:" | tee -a "$MAIN_LOG_FILE"
    for prog in "${failed_list[@]}"; do
        echo "- $prog" | tee -a "$MAIN_LOG_FILE"
    done
fi

echo -e "\nDetailed compilation log available at: $MAIN_LOG_FILE"

# Remove any remaining files in src/wasm directory
rm -rf "$SCRIPT_DIR/src/wasm"/*.wasm "$SCRIPT_DIR/src/wasm"/*.js

# Deactivate the virtual environment
deactivate