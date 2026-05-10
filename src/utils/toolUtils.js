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

/*
ToolInvocation = {
  toolName: string
  // Name of the tool to run

  uniqueId: string
  // Unique id for this execution
  // Two invocations of the same tool need to have different ids

  toolArguments: string[]
  // Arguments to pass directly to the tool

  inputs: {
    [inputName]: {
      mode: "text" | "output"
      // How the input value is resolved
      // "text" - input comes from the `value` below
      // "output" - input comes from the output of a previous invocation

      value: string | [string, string]
      // Changes depending on the `mode` above
      // mode = "text"   → string value
      // mode = "output" → [sourceTool, sourceToolOutputName]
    }
  }
}
*/
export async function runTools(
  toolInvocations,
  onToolFinished = () => { },
) {
  let outputs = {}
  let errors = {}

  // prepare tools to be loaded by aioli
  let aioliTools = []
  for (const invocation of toolInvocations) {
    const toolAlreadyAdded = aioliTools.some((t) => t.program == invocation.toolName)
    if (toolAlreadyAdded) continue

    const [wasmBlob, jsBlob] = await getToolBlobs(invocation.toolName)

    aioliTools.push({
      // TODO(andrade) look again into what each argument does
      program: invocation.toolName,
      scriptUrl: jsBlob,
      wasmUrl: wasmBlob,
      loading: "lazy",
      reinit: false,
    })
  }

  // load tools
  const CLI = await new Aioli(aioliTools, {
    // TODO(andrade) look again into what each argument does
    printInterleaved: false,
    debug: false,
  });

  // 1. Prepare the inputs
  for (const invocation of toolInvocations) {
    const toolDefinition = getTool(invocation.toolName)
    let args = invocation.toolArguments

    for (const inputDefinition of toolDefinition.io.inputs) {
      if (!invocation.inputs[inputDefinition.name]) continue
      const { mode, value } = invocation.inputs[inputDefinition.name];

      let inputFileName = undefined
      let stdinValue = undefined

      if (mode === "text") {
        if (inputDefinition.mode === "file") {
          inputFileName = `input-${invocation.uniqueId}-${inputDefinition.name}.txt`
        }
        else if (inputDefinition.mode === "stdin") {
          stdinValue = value
        }
      }
      else if (mode === "output") {
        const [source, sourceOutput] = value
        inputFileName = `${source}-${sourceOutput}.txt`

        if (inputDefinition.mode === "stdin") {
          stdinValue = await CLI.cat(inputFileName)
        }
      }

      if (inputDefinition.mode === "file") {
        await CLI.mount({ name: inputFileName, data: value })

        if (inputDefinition.flag) args.push(inputDefinition.flag)
        args.push(inputFileName)
      }
      else if (inputDefinition.mode === "stdin") {
        CLI.stdin = stdinValue
      }
    };

    // 2. Run the tool
    const { stdout, stderr } = await CLI.exec(invocation.toolName, args)
    errors[invocation.uniqueId] = stderr

    logger.log("[runMultipleTools]", invocation.toolName, {
      args,
      stdout,
      stderr,
    });
    // Artificial delay for testing purposes
    // const delay = 1000;
    // await new Promise(resolve => setTimeout(resolve, delay));

    // 3. Use outputs to save results and prepare files for the next invocations
    for (const outputDefinition of toolDefinition.io.outputs) {
      const outputFileName = `${invocation.uniqueId}-${outputDefinition.name}.txt`
      let result = ""

      if (outputDefinition.mode === "stdout") {
        await CLI.mount({ name: outputFileName, data: stdout })
        result = stdout
      }
      else if (outputDefinition.mode === "file") {
        let fileData = "";

        if (outputDefinition.filename) {
          fileData = await CLI.cat(outputDefinition.filename);
        }
        else {
          // TODO: the validate scripts should probably make sure that output to file
          // always has the filename defined instead of allowing this
          fileData = await CLI.cat(outputDefinition.name + ".txt");
        }

        await CLI.mount({ name: outputFileName, data: fileData })
        result = fileData
      }

      outputs[invocation.uniqueId] ??= {};
      outputs[invocation.uniqueId][outputDefinition.name] = result;
    }

    // call the callback function after invocation is done
    onToolFinished(invocation.uniqueId, outputs[invocation.uniqueId], errors[invocation.uniqueId])
  }

  return {"outputs": outputs, "errors": errors}
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