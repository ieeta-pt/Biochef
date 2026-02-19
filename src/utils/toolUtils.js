import Aioli from "./aioli-custom/aioli"

const toolMap = new Map();
const blobMap = new Map();
const REGISTRY_URL = process.env.REGISTRY_URL;
const REPO_OWNER = process.env.REPO_OWNER;
const REGISTRY_USERNAME = process.env.REGISTRY_USERNAME;
const REGISTRY_PASSWORD = process.env.REGISTRY_PASSWORD;

const IS_GHCR = REGISTRY_URL?.includes("ghcr.io") || false;

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
  const tokenRes = await fetch(
    `${REGISTRY_URL}/token?scope=repository:${REPO_OWNER}/${repo}:pull`,
    {
      headers: {
        Authorization: "Basic " + btoa(`${REGISTRY_USERNAME}:${REGISTRY_PASSWORD}`)
      }
    }
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Failed to fetch GHCR token: ${tokenRes.status} ${tokenRes.statusText}\n${errText}`);
  }

  const { token } = await tokenRes.json();
  return token;
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
  const res = await fetch(`${base_url}/${repo}/manifests/${tag}`, {
    headers: {
      Accept: "application/vnd.oci.image.manifest.v1+json",
      Authorization: authorization,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch manifest for ${repo}`);
  return await res.json();
}

async function fetchBlob(base_url, repo, digest, authorization, accept) {
  const res = await fetch(`${base_url}/${repo}/blobs/${digest}`, {
    headers: {
      Accept: accept,
      Authorization: authorization,
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch blob ${digest}`);
  return await res.json();
}

export async function loadToolIndex() {
  const { authorization, base_url } = await getAuthorizationAndBaseUrl("biochef-plugins-index");
  const manifest = await fetchManifest(base_url, "biochef-plugins-index", "index", authorization);
  const digest = manifest.layers[0].digest;
  const indexJson = await fetchBlob(base_url, "biochef-plugins-index", digest, authorization, "application/vnd.oci.image.manifest.v1+json");

  for (const [key, plugin] of Object.entries(indexJson)) {
    const bundle = {
      ...plugin,
      repo: key
    };
    toolMap.set(bundle.name, bundle);
  }
}

export async function loadTool(toolName) {
  const bundleEntry = toolMap.get(toolName);
  if (bundleEntry.parameters) return;

  const repo = bundleEntry.repo;
  const { authorization, base_url } = await getAuthorizationAndBaseUrl(repo);
  const manifest = await fetchManifest(base_url, repo, "latest", authorization);

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
  bundle = { ...toolMap.get(bundle.name), ...bundle }
  
  bundle.repo = repo;
  toolMap.set(bundle.name, bundle);
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

export async function runTool(toolName, inputs, args, files = {}) {
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

    for (const [inputName, inputValue] of Object.entries(inputs)) {
      const inputConfig = toolConfig.io.inputs.find(i => i.name === inputName);
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

    // let cli_result = { stdout: tool.stdout, stderr: tool.stderr };
    const cli_result = await CLI.exec(toolProgram, args);
    const error = cli_result.stderr
    console.log("[runTool] args:", args)
    console.log("[runTool] result:", cli_result)

    // read output files if tool outputs to a file
    const ignoreList = [".", ".."];
    const outputs = {};
    for (const output of toolConfig.io.outputs) {
      if (output.mode === "stdout") {
        outputs[output.name] = cli_result.stdout; // TODO: stderr
      }
      // TODO: maybe dont force the filename to have to be the same as the output name
      // we could add a new thing to the recipe that says file name?
      else if (output.mode === "file") {
        const files = await CLI.ls(".");
        const expectedName = output.name.toLowerCase();

        for (const fileName of files) {
          if (ignoreList.includes(fileName)) continue;
          const baseName = fileName.split(".").slice(0, -1).join(".").toLowerCase();

          if (baseName === expectedName) {
            const fileData = await CLI.cat(fileName);
            outputs[output.name] = fileData;
            break;
          }
        }
      }
    }

    return {"outputs": outputs, "error": error};

  } catch (error) {
    console.error(`Error running tool ${toolName}:`, error);
  }
}