import Aioli from "@biowasm/aioli";

const toolMap = new Map();

/**
 * Retrieves a tool by its name from the tool map.
 * 
 * @function
 * @param {string} toolName - The name of the tool to retrieve.
 * @returns {Object|undefined} The tool object if found, otherwise `undefined`.
 * 
 * @throws {Error} Will log an error if the tool is not found in the tool map.
 */
export function getTool(toolName) {
  if (!toolMap.has(toolName)) {
    // TODO: make a logging utility
    console.error(`[toolUtils.getTool] Tool ${toolName} is not loaded.`)
    return;
  }

  return toolMap.get(toolName);
}

export function getToolParameters(toolName) {
  const tool = getTool(toolName);
  const parameters = {}
  tool.parameters.forEach((param) => {
    parameters[param.name] = param
  })

  return parameters
}

/**
 * Retrieves all tools in the tool map.
 * 
 * @function
 * @returns {Array} An array of all tool objects.
 * 
 * @example
 * const tools = getAllTools();
 */
export function getAllTools() {
  return [...toolMap.values()];
}

/**
 * Retrieves tools categorized by their category.
 * If a tool does not have a category, it will be grouped under "Uncategorized".
 * 
 * @function
 * @returns {Object} An object where each key is a category and each value is an array of tools in that category.
 * 
 * @example
 * const categorizedTools = getToolsByCategory();
 */
export function getToolsByCategory() {
  const categorizedTools = {};

  toolMap.forEach((tool) => {
    const category = tool.category || 'Uncategorized';

    if (!categorizedTools[category]) {
      categorizedTools[category] = [];
    }

    categorizedTools[category].push(tool);
  });

  return categorizedTools;
}

/**
 * Loads tools from a JSON index file and adds them to the tool map.
 * 
 * This function fetches an index file (`/tool_index.json`) that contains the filenames of tool data files,
 * then fetches each tool data file and loads it into the `toolMap`.
 * 
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when all tools are loaded and added to the tool map.
 * 
 * @example
 * await loadTools(); // Load all tools
 */
export async function loadTools() {
  const indexRes = await fetch("/tool_index.json");

  if (!indexRes.ok) {
    throw new Error(`Failed to fetch tool index, status: ${indexRes.status}`);
  }

  const filenames = await indexRes.json();
  await Promise.all(
    filenames.map(async (filename) => {
      const res = await fetch(`/tools/${filename}`);

      if (!res.ok) {
        console.error(`Failed to fetch tool: ${filename}, status: ${res.status}`);
        return;
      }

      const toolData = await res.json();
      toolMap.set(filename.replace(/\.json$/, ''), toolData);
    })
  );
}

export async function runTool(toolName, input, args, files = {}) {
    console.log(`Running tool ${toolName} with arguments:`, args);
    const toolConfig = getTool(toolName)
    const toolProgram = toolConfig.program || toolName

    try {
      const CLI = await new Aioli([{
        program: toolProgram,
        urlPrefix: `${window.location.origin}/wasm/${toolConfig.tool}//${toolConfig.version}/`,
        loading: "lazy",
        reinit: false,
      }], {
        printInterleaved: false,
        debug: true,
      });

      // create necessary files
      if (files && Object.keys(files).length > 0) {
        await CLI.mount(Object.values(files));
      }

      if (toolConfig.input.type == "file") {
        // TODO: find a way for the user to not upload a file with this name
        // and maybe create a file with the correct format instead of txt
        await CLI.mount({ name: "input.txt", data: input })
        args.push("input.txt")
      }
      else {
        CLI.stdin = input;
      }

      // let result = { stdout: tool.stdout, stderr: tool.stderr };
      const result = await CLI.exec(toolProgram, args);

      // read output files if tool outputs to a file
      const ignoreList = [".", ".."];
      if (toolConfig.is_multi_output && toolConfig.output.type == "file") {
        result.outputs = {}
        for (const fileName of await CLI.ls(".")) {
          if (ignoreList.includes(fileName)) continue
          const fileData = await CLI.cat(fileName);
          console.log(fileName, fileData);
          result.outputs[fileName] = fileData;
        }
      }

    return result;

  } catch (error) {
    console.error(`Error running tool ${toolName}:`, error);
  }
}