import Aioli from "./aioli-custom/aioli"
import logger from "./logger";
import { detectIsBinaryFile } from "./detectDataType";
import { makeBinaryDataValue, makeTextDataValue } from './dataValue'
import { verifySha256Digest } from "./artifactIntegrity";
import {
  DEFAULT_CATALOG_PACKAGE,
  DEFAULT_CATALOG_PUBLIC_JWK,
  validateCatalogEntry,
  verifySignedCatalog,
} from "./catalogTrust";

const toolMap = new Map();
const blobMap = new Map();
const REGISTRY_URL = process.env.REGISTRY_URL;
const REPO_OWNER = process.env.REPO_OWNER;
const REGISTRY_USERNAME = process.env.REGISTRY_USERNAME;
const REGISTRY_PASSWORD = process.env.REGISTRY_PASSWORD;
const CATALOG_PACKAGE = process.env.BIOCHEF_CATALOG_PACKAGE || DEFAULT_CATALOG_PACKAGE;
const CATALOG_PUBLIC_JWK = process.env.BIOCHEF_CATALOG_PUBLIC_JWK || DEFAULT_CATALOG_PUBLIC_JWK;

const IS_GHCR = REGISTRY_URL?.includes("ghcr.io") || false;

function authorizationHeaders(authorization) {
  return authorization ? { Authorization: authorization } : {};
}

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
      authorization: REGISTRY_USERNAME && REGISTRY_PASSWORD
        ? "Basic " + btoa(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`)
        : null,
      base_url: `${REGISTRY_URL}/v2`,
    };
  }
}

async function fetchManifest(base_url, repo, tag, authorization) {
  try {
    const res = await fetch(`${base_url}/${repo}/manifests/${tag}`, {
      headers: {
        Accept: "application/vnd.oci.image.manifest.v1+json",
        ...authorizationHeaders(authorization),
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
  const arrayBuffer = await fetchBlobBytes(base_url, repo, digest, authorization, accept);
  if (!arrayBuffer) return false;
  return JSON.parse(new TextDecoder("utf-8").decode(arrayBuffer));
}

async function fetchBlobBytes(base_url, repo, digest, authorization, accept) {
  try {
    const res = await fetch(`${base_url}/${repo}/blobs/${digest}`, {
      headers: {
        Accept: accept,
        ...authorizationHeaders(authorization),
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
    return await res.arrayBuffer();

  } catch (err) {
    logger.error(`fetchBlob network error for ${repo}@${digest}`, err);
    return false;
  }
}

function findLayer(manifest, mediaType, fileName) {
  const matchingLayers = manifest.layers?.filter(
    layer =>
      layer.mediaType === mediaType &&
      layer.annotations?.["org.opencontainers.image.title"] === fileName
  );
  return matchingLayers?.length === 1 ? matchingLayers[0] : null;
}

function digestFromReference(digestReference) {
  const digest = digestReference?.split("@").pop();
  if (!digest?.startsWith("sha256:")) {
    throw new Error(`Invalid immutable digest reference: ${digestReference}`);
  }
  return digest;
}

export async function loadToolIndex() {
  const { authorization, base_url } = await getAuthorizationAndBaseUrl(CATALOG_PACKAGE);
  if (!base_url) return false

  const manifest = await fetchManifest(base_url, CATALOG_PACKAGE, "latest", authorization);
  if (!manifest) return false

  const catalogLayer = findLayer(manifest, "application/vnd.biochef.verified-catalog+json", "index.json");
  const signatureLayer = findLayer(manifest, "application/vnd.biochef.catalog-signature+json", "index.sig.json");
  if (!catalogLayer || !signatureLayer) {
    logger.error("Verified catalog or catalog signature layer is missing");
    return false;
  }

  const catalogBytes = await fetchBlobBytes(base_url, CATALOG_PACKAGE, catalogLayer.digest, authorization, "application/vnd.biochef.verified-catalog+json");
  const signatureDocument = await fetchBlob(base_url, CATALOG_PACKAGE, signatureLayer.digest, authorization, "application/vnd.biochef.catalog-signature+json");
  if (!catalogBytes || !signatureDocument) return false

  const catalog = await verifySignedCatalog(catalogBytes, signatureDocument, CATALOG_PUBLIC_JWK, REGISTRY_URL, REPO_OWNER);

  const verifiedTools = [];
  for (const [key, plugin] of Object.entries(catalog.packages)) {
    validateCatalogEntry(plugin);
    verifiedTools.push({
      ...plugin,
      repo: plugin.package || key,
      catalogEntry: plugin,
    });
  }

  // Replace the visible catalogue only after every entry has passed validation.
  toolMap.clear();
  for (const bundle of verifiedTools) {
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
  if (!base_url) return false;

  validateCatalogEntry(bundleEntry.catalogEntry || bundleEntry);
  const manifest = await fetchManifest(base_url, repo, digestFromReference(bundleEntry.digest_reference), authorization);
  if (!manifest) return false;

  const bundleLayer = findLayer(manifest, "application/vnd.biochef.bundle+json", "bundle.json");

  if (!bundleLayer) {
    console.error(`No bundle.json layer found for ${repo}`);
    return;
  }

  const bundleBytes = await fetchBlobBytes(base_url, repo, bundleLayer.digest, authorization, "application/vnd.biochef.bundle+json");
  if (!bundleBytes) return false;
  await verifySha256Digest(bundleBytes, bundleEntry.evidence.bundle_json, `${repo}/bundle.json`);
  var bundle = JSON.parse(new TextDecoder("utf-8").decode(bundleBytes));
  if (!bundle) return false

  if (
    bundle.id !== bundleEntry.id ||
    bundle.name !== bundleEntry.name ||
    bundle.version !== bundleEntry.version ||
    bundle.runtime?.wasm?.wasm_digest !== bundleEntry.runtime.wasm.wasm_digest ||
    bundle.runtime?.wasm?.js_digest !== bundleEntry.runtime.wasm.js_digest
  ) {
    logger.error(`Loaded bundle does not match verified catalog entry for ${repo}`);
    return false;
  }

  bundle = { ...bundleEntry, ...bundle }

  bundle.repo = repo;
  bundle.catalogEntry = bundleEntry.catalogEntry;
  toolMap.set(toolName, bundle);

  return true
}

async function generateBlob(url, type, authorization, expectedDigest) {
  const cacheKey = `${url}|${expectedDigest}`;
  if (blobMap.has(cacheKey)) return blobMap.get(cacheKey);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: type,
        ...authorizationHeaders(authorization),
      },
    });
    if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status} ${res.statusText}`);

    const arrayBuffer = await res.arrayBuffer();
    await verifySha256Digest(arrayBuffer, expectedDigest, url);
    const blob = new Blob([arrayBuffer], { type });
    const blobURL = URL.createObjectURL(blob);
    blobMap.set(cacheKey, blobURL);
    return blobURL;
  } catch (err) {
    console.error("Failed to load authenticated blob:", err);
    throw err;
  }
}

async function getToolBlobs(toolName) {
  const toolConfig = getTool(toolName)

  const { authorization, base_url } = await getAuthorizationAndBaseUrl(toolConfig.repo);

  const wasmUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.wasm_digest}`
  const jsUrl = `${base_url}/${toolConfig.repo}/blobs/${toolConfig.runtime.wasm.js_digest}`
  const wasmBlob = await generateBlob(wasmUrl, "application/wasm", authorization, toolConfig.runtime.wasm.wasm_digest)
  const jsBlob = await generateBlob(jsUrl, "application/javascript", authorization, toolConfig.runtime.wasm.js_digest)

  return [wasmBlob, jsBlob]
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
          await CLI.mount({ name: inputFileName, data: fileContent })
        }
        else if (inputDefinition.mode === "stdin") {
          stdinValue = value.data
        }
      }
      else if (mode === "output") {
        const [source, sourceOutput] = value
        inputFileName = `${source}-${sourceOutput}.txt`

        if (inputDefinition.mode === "stdin") {
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
        CLI.stdin = stdinValue
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

    // 2. Run the tool
    const { stdout, stderr } = await CLI.exec(invocation.toolName, args)
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
        await CLI.mount({ name: outputFileName, data: stdout })
        result = makeTextDataValue(stdout)
      }
      else if (outputDefinition.mode === "file") {
        const fileToRead = outputDefinition.filename ?? `${invocation.uniqueId}-${outputDefinition.name}.txt`

        result = await aioliReadFileHelper(CLI, fileToRead)
        if (!result) {
          // TODO maybe have a proper way to handle this
          result = makeTextDataValue("")
          errors[invocation.uniqueId].push(`Output "${outputDefinition.name}" did not produce the expected file "${fileToRead}"`)
        }

        if (result.kind == "binary") {
          await CLI.mount({ name: outputFileName, data: new Blob([result.data]) })
        }
        else {
          await CLI.mount({ name: outputFileName, data: result.data })
        }
      }

      outputs[invocation.uniqueId] ??= {};
      outputs[invocation.uniqueId][outputDefinition.name] = result;
    }

    // call the callback function after invocation is done
    onToolFinished(invocation.uniqueId, outputs[invocation.uniqueId], errors[invocation.uniqueId])
  }

  logger.log("[runMultipleTools] Results", outputs, errors);

  return { "outputs": outputs, "errors": errors }
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