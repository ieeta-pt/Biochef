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