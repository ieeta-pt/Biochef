import Aioli from "./aioli-custom/aioli"
import RRuntime from "./rRuntime"
import logger from "./logger";
import { detectIsBinaryFile } from "./detectDataType";
import { makeBinaryDataValue, makeTextDataValue } from './dataValue'

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

/** An operation runs under webR when its bundle carries an `r` runtime block. */
export function isROperation(toolName) {
  return Boolean(getTool(toolName)?.runtime?.r)
}

async function fetchToolBytes(base_url, repo, digest, authorization) {
  const res = await fetch(`${base_url}/${repo}/blobs/${digest}`, {
    headers: { Authorization: authorization, Accept: "application/octet-stream" },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${digest} for ${repo}: ${res.status} ${res.statusText}`)
  return new Uint8Array(await res.arrayBuffer())
}

/**
 * Fetches what one R operation needs: the package library, its index, and the
 * script.
 *
 * Unlike the wasm path these are not turned into object URLs. The library has
 * to be handed to webR as bytes so it can be inflated and mounted, and the
 * script has to be handed over as source.
 */
async function getRToolBlobs(toolName) {
  const toolConfig = getTool(toolName)
  const { authorization, base_url } = await getAuthorizationAndBaseUrl(toolConfig.repo)
  const { library_digest, metadata_digest, script_digest } = toolConfig.runtime.r

  const [library, metadataBytes, scriptBytes] = await Promise.all([
    fetchToolBytes(base_url, toolConfig.repo, library_digest, authorization),
    fetchToolBytes(base_url, toolConfig.repo, metadata_digest, authorization),
    fetchToolBytes(base_url, toolConfig.repo, script_digest, authorization),
  ])

  const decoder = new TextDecoder("utf-8")
  return {
    library,
    metadata: JSON.parse(decoder.decode(metadataBytes)),
    script: decoder.decode(scriptBytes),
  }
}

async function aioliReadFileHelper(CLI, fileName) {
  const stat = await CLI.ls(fileName)

  if (!stat) {
    logger.warn(`[aioliReadFileHelper] File ${fileName} does not exist`)
    return
  }

  const buffer = await CLI.read({ path: fileName, length: stat.size })

  if (detectIsBinaryFile(buffer)) {
    return makeBinaryDataValue(buffer);
  }
  else {
    const text = new TextDecoder("utf-8").decode(buffer);
    return makeTextDataValue(text)
  }
}

/*
ToolInvocation = {
  toolName: string
  // Name of the tool to execute

  uniqueId: string
  // Unique identifier for this execution
  
  toolArguments: string[]
  // CLI arguments passed directly to the tool

  inputs: {
    [inputName]: {
      mode: "text" | "output"
      // "text"
      //   Direct literal DataValue provided as input
      //   value is a DataValue:
      //   {
      //     kind: "text" | "binary" | "reference",
      //     data: any
      //   }

      // "output"
      //   Input comes from a previous tool invocation output
      //   value is a tuple:
      //   [sourceToolUniqueId, sourceOutputName]

      value: DataValue | [string, string]
    }
  }
}
*/
export async function runTools(
  toolInvocations,
  onToolFinished = () => { },
) {
  logger.log("[runMultipleTools] Running invocations", toolInvocations);

  let outputs = {}
  let errors = {}

  // prepare tools to be loaded by aioli
  let aioliTools = []
  for (const invocation of toolInvocations) {
    // R operations are not aioli tools: they have no wasm binary, and webR runs
    // in a worker of its own.
    if (isROperation(invocation.toolName)) continue

    const toolAlreadyAdded = aioliTools.some((t) => t.tool == invocation.toolName)
    if (toolAlreadyAdded) continue

    const [wasmBlob, jsBlob] = await getToolBlobs(invocation.toolName)

    const needsReinit = invocation.toolName.includes("GTO")

    aioliTools.push({
      // TODO(andrade) look again into what each argument does
      tool: invocation.toolName,
      scriptUrl: jsBlob,
      wasmUrl: wasmBlob,
      loading: "lazy",
      reinit: needsReinit,
    })
  }

  const hasNonReinitTool = aioliTools.some((t) => t.reinit === false);
  if (!hasNonReinitTool) aioliTools.push("base/1.0.0")

  // load tools. A run made up entirely of R operations needs no aioli worker,
  // and Aioli rejects an empty tool list, so only build one when something will
  // use it.
  const needsAioli = toolInvocations.some((i) => !isROperation(i.toolName))
  const CLI = needsAioli
    ? await new Aioli(aioliTools, {
      // TODO(andrade) look again into what each argument does
      printInterleaved: false,
      debug: false,
    })
    : null;

  // webR is started on first use rather than up front. It is a far larger
  // download than any single tool's wasm, and most runs never touch R.
  let R = null
  const rScripts = new Map()
  async function loadROperation(toolName) {
    if (rScripts.has(toolName)) return rScripts.get(toolName)

    const { library, metadata, script } = await getRToolBlobs(toolName)
    const image = { mountPoint: `/lib-${rScripts.size}`, data: library, metadata }

    if (!R) R = await RRuntime.create({ libraryImages: [image] })
    else await R.mountLibrary(image)

    rScripts.set(toolName, script)
    return script
  }

  try {

  // 1. Prepare the inputs
  for (const invocation of toolInvocations) {
    const toolDefinition = getTool(invocation.toolName)
    const isR = isROperation(invocation.toolName)
    // Each invocation runs against whichever runtime owns it. The two have
    // separate filesystems, so this is also which filesystem its files live in.
    const rScript = isR ? await loadROperation(invocation.toolName) : null
    const runtime = isR ? R : CLI
    let args = invocation.toolArguments
    let lastArgs = [] // arguments that must appear after all flagged arguments.

    for (const inputDefinition of toolDefinition.io.inputs) {
      if (!invocation.inputs[inputDefinition.name]) continue
      const { mode, value } = invocation.inputs[inputDefinition.name];

      let inputFileName = undefined
      let stdinValue = undefined

      if (mode === "text") {
        if (inputDefinition.mode === "file") {
          inputFileName = `input-${invocation.uniqueId}-${inputDefinition.name}.txt`
          const fileContent = value.kind === "binary" ? new Blob([value.data]) : value.data;
          await runtime.mount({ name: inputFileName, data: fileContent })
        }
        else if (inputDefinition.mode === "stdin") {
          stdinValue = value.data
        }
      }
      else if (mode === "output") {
        const [source, sourceOutput] = value
        inputFileName = `${source}-${sourceOutput}.txt`

        if (isR) {
          // An aioli tool's output file lives in the aioli worker's
          // filesystem, which webR cannot see. Every output is also kept as a
          // DataValue, so the bytes are copied across from there rather than
          // read back out of a filesystem this runtime has no access to.
          const produced = outputs[source]?.[sourceOutput]
          if (!produced) {
            errors[invocation.uniqueId] ??= []
            errors[invocation.uniqueId].push(
              `Input "${inputDefinition.name}" expected output "${sourceOutput}" of ${source}, which was not produced`
            )
          } else {
            await runtime.mount({
              name: inputFileName,
              data: produced.kind === "binary" ? new Blob([produced.data]) : produced.data,
            })
            if (inputDefinition.mode === "stdin") stdinValue = produced.data
          }
        }
        else if (inputDefinition.mode === "stdin") {
          const fileData = await aioliReadFileHelper(CLI, inputFileName)
          stdinValue = fileData.data
        }
      }

      if (inputDefinition.mode === "file") {
        if (inputDefinition.flag) {
          args.push(inputDefinition.flag)
          args.push(inputFileName)
        }
        else {
          lastArgs.push(inputFileName)
        }
      }
      else if (inputDefinition.mode === "stdin") {
        runtime.stdin = stdinValue
      }
    };

    for (const outputDefinition of toolDefinition.io.outputs) {
      if (outputDefinition.mode !== "file" || outputDefinition.flag == undefined) continue

      const outputTarget = outputDefinition.filename ?? `${invocation.uniqueId}-${outputDefinition.name}.txt`

      if (outputDefinition.flag == "") {
        lastArgs.push(outputTarget)
      }
      else {
        args.push(outputDefinition.flag)
        args.push(outputTarget)
      }
    }
    
    args = [...args, ...lastArgs]

    // 2. Run the tool. An R operation is a script rather than a binary, so it
    // is the script source that is executed, with the same argument vector the
    // recipe's io and parameters produced.
    const { stdout, stderr } = isR
      ? await runtime.exec(rScript, args)
      : await runtime.exec(invocation.toolName, args)
    errors[invocation.uniqueId] = [stderr]

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
      let result

      if (outputDefinition.mode === "stdout") {
        await runtime.mount({ name: outputFileName, data: stdout })
        result = makeTextDataValue(stdout)
      }
      else if (outputDefinition.mode === "file") {
        const fileToRead = outputDefinition.filename ?? `${invocation.uniqueId}-${outputDefinition.name}.txt`

        result = await aioliReadFileHelper(runtime, fileToRead)
        if (!result) {
          // TODO maybe have a proper way to handle this
          result = makeTextDataValue("")
          errors[invocation.uniqueId].push(`Output "${outputDefinition.name}" did not produce the expected file "${fileToRead}"`)
        }

        if (result.kind == "binary") {
          await runtime.mount({ name: outputFileName, data: new Blob([result.data]) })
        }
        else {
          await runtime.mount({ name: outputFileName, data: result.data })
        }
      }

      // An R operation's results are invisible to the aioli worker, so a
      // subsequent C tool reading `${uniqueId}-${name}.txt` would not find
      // them. Copy them across while the bytes are to hand.
      if (isR && CLI) {
        await CLI.mount({
          name: outputFileName,
          data: result.kind === "binary" ? new Blob([result.data]) : result.data,
        })
      }

      outputs[invocation.uniqueId] ??= {};
      outputs[invocation.uniqueId][outputDefinition.name] = result;
    }

    // call the callback function after invocation is done
    onToolFinished(invocation.uniqueId, outputs[invocation.uniqueId], errors[invocation.uniqueId])
  }

  logger.log("[runMultipleTools] Results", outputs, errors);

  return { "outputs": outputs, "errors": errors }
  } finally {
    // Each run owns its workers: an aioli worker holding the loaded tools and
    // their wasm heaps, and a webR worker holding an R session. Without this
    // they accumulate for the lifetime of the page, one set per run, including
    // when a run throws part way. Every output is materialised as a DataValue
    // before this point, so nothing reads either filesystem afterwards.
    for (const [name, worker] of [["Aioli", CLI], ["webR", R]]) {
      if (!worker) continue
      try {
        await worker.close()
      } catch (err) {
        logger.warn(`[runMultipleTools] Failed to close the ${name} worker`, err)
      }
    }
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

export function toolHasNoInputs(toolName) {
  const tool = getTool(toolName);
  if (!tool) return true;

  return !tool.io?.inputs || tool.io.inputs.length === 0;
}