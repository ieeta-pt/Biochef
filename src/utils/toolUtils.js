import Aioli from "./aioli-custom/aioli"
import logger from "./logger";

const toolMap = new Map();
const blobMap = new Map();
const REGISTRY_URL = process.env.REGISTRY_URL;
const REPO_OWNER = process.env.REPO_OWNER;
const REGISTRY_USERNAME = process.env.REGISTRY_USERNAME;
const REGISTRY_PASSWORD = process.env.REGISTRY_PASSWORD;

const IS_GHCR = REGISTRY_URL?.includes("ghcr.io") || false;

// TODO: use ID instead of tool name
export function getTool(toolName) {
  if (!toolMap.has(toolName)) {
    logger.error(`[toolUtils.getTool] Tool ${toolName} is not loaded.`)
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

export function getAllTools() {
  return [...toolMap.values()];
}

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

async function getGHCRToken(repo) {
  try {
    const res = await fetch(
      `${REGISTRY_URL}/token?scope=repository:${REPO_OWNER}/${repo}:pull`,
      {
        headers: {
          Authorization: "Basic " + btoa(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`)
        }
      }
    );

    if (!res.ok) {
      const text = await res.text();
      logger.error(`GHCR error ${res.status}: ${text}`);
      return false
    }

    const data = await res.json();

    if (!data.token) {
      logger.error("getGHCRToken got no token in response");
      return false
    }

    return data.token;

  } catch (err) {
    logger.error(`getGHCRToken failed: ${err.message}`);
    return false
  }
}

async function getAuthorizationAndBaseUrl(repo) {
  if (IS_GHCR) {
    const token = await getGHCRToken(repo);
    return {
      authorization: `Bearer ${token}`,
      base_url: `${REGISTRY_URL}/v2/${REPO_OWNER}`,
    };
  } else {
    return {
      authorization: "Basic " + btoa(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`),
      base_url: `${REGISTRY_URL}/v2`,
    };
  }
}

async function fetchManifest(base_url, repo, tag, authorization) {
  try {
    const res = await fetch(`${base_url}/${repo}/manifests/${tag}`, {
      headers: {
        Accept: "application/vnd.oci.image.manifest.v1+json",
        Authorization: authorization,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`Failed to fetch manifest (${res.status}): ${repo}:${tag}\n${text}`);
      return false
    }

    return await res.json();
  } catch (err) {
    logger.error(`fetchManifest failed: ${err.message}`);
    return false
  }
}

async function fetchBlob(base_url, repo, digest, authorization, accept) {
  try {
    const res = await fetch(`${base_url}/${repo}/blobs/${digest}`, {
      headers: {
        Accept: accept,
        Authorization: authorization,
      },
    });

    if (!res.ok) {
      const text = await res.text();

      logger.error(
        `fetchBlob failed for ${repo}@${digest} (${res.status} ${res.statusText})`,
        text
      );

      return false;
    }
    return await res.json();

  } catch (err) {
    logger.error(`fetchBlob network error for ${repo}@${digest}`, err);
    return false;
  }
}

export async function loadToolIndex() {
  const { authorization, base_url } = await getAuthorizationAndBaseUrl("biochef-plugins-index");
  if (!authorization || !base_url) return false

  const manifest = await fetchManifest(base_url, "biochef-plugins-index", "index", authorization);
  if (!manifest) return false

  const digest = manifest.layers[0].digest;
  const indexJson = await fetchBlob(base_url, "biochef-plugins-index", digest, authorization, "application/vnd.oci.image.manifest.v1+json");

  for (const [key, plugin] of Object.entries(indexJson)) {
    const bundle = {
      ...plugin,
      repo: key
    };
    toolMap.set(bundle.name, bundle);
  }

  return true
}

export async function loadTool(toolName) {
  const bundleEntry = toolMap.get(toolName);
  if (!bundleEntry) {
    logger.error(`Trying to load tool ${toolName} that is not in the index`)
    return false
  }

  if (bundleEntry.parameters) return true; // already loaded

  const repo = bundleEntry.repo;
  const { authorization, base_url } = await getAuthorizationAndBaseUrl(repo);
  if (!authorization || !base_url) return false;

  const manifest = await fetchManifest(base_url, repo, "latest", authorization);
  if (!manifest) return false;

  const bundleLayer = manifest.layers.find(
    layer =>
      layer.mediaType === "application/vnd.biochef.bundle+json" ||
      layer.annotations?.["org.opencontainers.image.title"] === "bundle.json"
  );

  if (!bundleLayer) {
    console.error(`No bundle.json layer found for ${repo}`);
    return;
  }

  var bundle = await fetchBlob(base_url, repo, bundleLayer.digest, authorization, "application/vnd.oci.image.manifest.v1+json");
  if (!bundle) return false

  bundle = { ...toolMap.get(bundle.name), ...bundle }

  bundle.repo = repo;
  toolMap.set(bundle.name, bundle);

  return true
}

async function generateBlob(url, type, authorization) {
  if (blobMap.has(url)) return blobMap.get(url);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: authorization,
        Accept: type
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status} ${res.statusText}`);

    const arrayBuffer = await res.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type });
    const blobURL = URL.createObjectURL(blob);
    blobMap.set(url, blobURL);
    return blobURL;
  } catch (err) {
    console.error("Failed to load authenticated blob:", err);
    return null;
  }
}

async function getToolBlobs(toolName) {
  const toolConfig = getTool(toolName)

  const { authorization, base_url } = await getAuthorizationAndBaseUrl(toolConfig.repo);

  const wasmUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.wasm_digest}`
  const jsUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.js_digest}`
  const wasmBlob = await generateBlob(wasmUrl, "application/wasm", authorization)
  const jsBlob = await generateBlob(jsUrl, "application/javascript", authorization)

  return [wasmBlob, jsBlob]
}

export async function runMultipleTools(
  toolsToRun,
  inputFiles = [],
  onToolFinished = () => {},
) {

  let aioliTools = []
  for (const tool of toolsToRun) {
    if (aioliTools.some((t) => t.program == tool.name)) continue

    const [wasmBlob, jsBlob] = await getToolBlobs(tool.name)

    aioliTools.push({
      program: tool.name,
      scriptUrl: jsBlob,
      wasmUrl: wasmBlob,
      loading: "lazy",
      reinit: false,
    })
  }

  const CLI = await new Aioli(aioliTools, {
    printInterleaved: false,
    debug: false,
  });

  for (const { name: fileName, data: fileData } of inputFiles) {
    await CLI.mount({ name: fileName, data: fileData })
  }

  const results = {}
  for (const tool of toolsToRun) {
    const toolConfig = getTool(tool.name)
    let args = tool.args

    for (const inputConfig of toolConfig.io.inputs) {
      const inputName = inputConfig.name;

      if (!tool.inputs[inputName]) continue
      const { node: outputNode, handle: outputHandle } = tool.inputs[inputName];

      const inputFileName = `${outputNode}-${outputHandle}.txt`
      // const inputFileExists = !!await CLI.cat(inputFileName)

      if (inputConfig.mode == "file") {
        if (inputConfig.flag) args.push(inputConfig.flag);
        args.push(inputFileName)
      }
      else if (inputConfig.mode == "stdin") {
        // TODO: not sure what would happen if more than one inputs is through stdin
        // maybe we should make it so that is not possible in the recipe
        CLI.stdin = await CLI.cat(inputFileName);
      }
    };

    const { stdout, stderr } = await CLI.exec(tool.name, args)

    // Artificial delay for testing purposes
    // const delay = 1000;
    // await new Promise(resolve => setTimeout(resolve, delay));

    logger.log("[runMultipleTools]", tool.name, {
      args,
      stdout,
      stderr,
    });

    for (const output of toolConfig.io.outputs) {
      const outputFileName = `${tool.id}-${output.name}.txt`
      let result = ""

      if (output.mode === "stdout") {
        await CLI.mount({ name: outputFileName, data: stdout })
        result = stdout
      }
      else if (output.mode === "file") {
        let fileData = "";

        if (output.filename) {
          fileData = await CLI.cat(output.filename);
        }
        else {
          // TODO: the validate scripts should probably make sure that output to file
          // always has the filename defined instead of allowing this
          fileData = await CLI.cat(output.name + ".txt");
        }

        await CLI.mount({ name: outputFileName, data: fileData })
        result = fileData
      }

      results[tool.id] ??= {};
      results[tool.id][output.name] = result;
    }

    onToolFinished(tool.id, results[tool.id])
  }

  return results
}

export async function runTool(
  toolName,
  inputs,
  args,
  files = {},
  outputsToConsider = [], // names of outputs to consider 
) {
  const toolConfig = getTool(toolName)
  const toolProgram = toolConfig.program || toolName

  const { authorization, base_url } = await getAuthorizationAndBaseUrl(toolConfig.repo);

  const wasmUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.wasm_digest}`
  const jsUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.js_digest}`
  const wasmBlob = await generateBlob(wasmUrl, "application/wasm", authorization)
  const jsBlob = await generateBlob(jsUrl, "application/javascript", authorization)

  try {
    const CLI = await new Aioli([{
      program: toolProgram,
      // urlPrefix: `${window.location.origin}/wasm/${toolConfig.tool}//${toolConfig.version}/`,
      scriptUrl: jsBlob,
      wasmUrl: wasmBlob,
      loading: "lazy",
      reinit: false,
    }], {
      printInterleaved: false,
      debug: false,
    });

    // create necessary files
    if (files && Object.keys(files).length > 0) {
      await CLI.mount(Object.values(files));
    }

    for (const inputConfig of toolConfig.io.inputs) {
      const inputName = inputConfig.name;
      const inputValue = inputs[inputName];

      if (!inputValue) continue

      const fileName = `${inputName}.txt`

      if (inputConfig.mode == "file") {
        await CLI.mount({ name: fileName, data: inputValue })
        if (inputConfig.flag) args.push(inputConfig.flag);
        args.push(fileName)
      }
      else if (inputConfig.mode == "stdin") {
        // TODO: check if only one has stdin? or maybe add them?
        CLI.stdin = inputValue;
      }
    };

    for (const output of toolConfig.io.outputs) {
      if (outputsToConsider != [] && !outputsToConsider.includes(output.name)) {
        continue;
      }
      if (output.mode == "file" && !output.filename) {
        const fileName = `${output.name}.txt`
        // await CLI.mount({ name: fileName, data: "" })

        if (output.flag) args.push(output.flag);
        args.push(fileName)
      }
    };

    // let cli_result = { stdout: tool.stdout, stderr: tool.stderr };
    const cli_result = await CLI.exec(toolProgram, args);
    const error = cli_result.stderr

    // Artificial delay for testing purposes
    // const delay = 10000;
    // await new Promise(resolve => setTimeout(resolve, delay));

    logger.log("[runTool]", toolName, {
      toolName,
      args,
      cli_result,
      inputs
    });

    // read output files if tool outputs to a file
    const ignoreList = [".", ".."];
    const outputs = {};
    for (const output of toolConfig.io.outputs) {
      if (output.mode === "stdout") {
        outputs[output.name] = cli_result.stdout; // TODO: stderr
      }
      else if (output.mode === "file") {
        let fileData = "";
        if (output.filename) {
          fileData = await CLI.cat(output.filename);
        }
        else {
          fileData = await CLI.cat(output.name + ".txt");
        }
        outputs[output.name] = fileData;
      }
    }

    return { "outputs": outputs, "error": error };

  } catch (error) {
    console.error(`Error running tool ${toolName}:`, error);
  }
}

export function getToolInputByName(toolName, inputName) {
  const tool = getTool(toolName)
  if (!tool) return null

  return getTool(toolName)?.io?.inputs?.find(i => i.name == inputName)?.types || null;
}

export function getToolOutputByName(toolName, outputName) {
  const tool = getTool(toolName)
  if (!tool) return null

  return getTool(toolName)?.io?.outputs?.find(o => o.name == outputName)?.types || null;
}