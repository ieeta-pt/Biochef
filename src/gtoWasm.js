/**
 * Loads a specific GTO tool's wrapper function.
 * @param {string} toolName - The name of the GTO tool/module to load.
 * @returns {Promise<Function>} - The run function of the module.
 */

export async function loadWasmModule(toolName) {
  try {
    console.log(`Attempting to load module for tool: ${toolName}`);
    const moduleName = toolName; // Assume toolName is without 'gto_' prefix
    const scriptUrl = process.env.NODE_ENV === 'production'
      ? `/Biochef/wasm/${moduleName}_wrapper.js`
      : `/wasm/${moduleName}_wrapper.js`;
    console.log(`Script URL: ${scriptUrl}`);

    await loadScript(scriptUrl);
    console.log(`Script loaded successfully: ${scriptUrl}`);

    const runFunctionName = `run_${moduleName}`;
    console.log(`Looking for run function: ${runFunctionName}`);

    // Retry mechanism to wait for the function to be available
    let retries = 5;
    while (retries > 0) {
      const runFunction = window[runFunctionName];
      if (typeof runFunction === 'function') {
        console.log(`Run function found for ${toolName}`);
        return runFunction;
      }
      console.log(`Run function not found, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait for 100ms before retrying
      retries--;
    }

    console.error(`Run function not found for ${toolName}`);
    throw new Error(`Function ${runFunctionName} not found on window.`);
  } catch (error) {
    console.error(`Failed to load module for ${toolName}`, error);
    throw error;
  }
}

/**
 * Dynamically loads a script into the document.
 * @param {string} src - The URL of the script to load.
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to load script: ${src}`);
    if (document.querySelector(`script[src="${src}"]`)) {
      console.log(`Script already loaded: ${src}`);
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    script.onload = () => {
      console.log(`Script loaded successfully: ${src}`);
      resolve();
    };
    script.onerror = () => {
      console.error(`Failed to load script: ${src}`);
      reject(new Error(`Failed to load script: ${src}`));
    };

    document.head.appendChild(script);
  });
}