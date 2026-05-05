// Walk a workflow object and swap binary DataValues out for ref markers,
// storing the actual bytes in IndexedDB. localStorage just holds the JSON
// with refs; on load we reverse the swap.

import { isDataValue, isBinaryRef, makeBinary, makeBinaryRef } from "./dataValue";
import { putBlob, getBlob, gcBlobs } from "./blobStore";

// Walk node.data.outputs across all nodes, replace binary DataValues with refs.
// Returns the modified `flow` (mutated copy of nodes) plus the set of refs in use.
export async function externalizeBinaryOutputs(flow) {
  const usedRefs = [];
  const nodes = await Promise.all((flow.nodes || []).map(async (node) => {
    const outs = node.data?.outputs;
    if (!outs || typeof outs !== "object") return node;
    const newOuts = {};
    for (const [k, v] of Object.entries(outs)) {
      // Externalise every binary DataValue, even empty ones. A raw Uint8Array
      // survives JSON.stringify as {} (an indexed object) and on reload that
      // would break new Blob([{}]) at mount time.
      if (isDataValue(v) && v.kind === "binary") {
        const bytes = v.data instanceof Uint8Array ? v.data : new Uint8Array(0);
        const id = await putBlob(bytes, v.type);
        usedRefs.push(id);
        newOuts[k] = makeBinaryRef(id, v.type);
      } else {
        newOuts[k] = v;
      }
    }
    return { ...node, data: { ...node.data, outputs: newOuts } };
  }));
  return { flow: { ...flow, nodes }, usedRefs };
}

// Reverse the swap: walk loaded flow, find {kind:"binary-ref"} markers, fetch
// bytes from IndexedDB and rebuild DataValues.
export async function hydrateBinaryOutputs(flow) {
  const nodes = await Promise.all((flow.nodes || []).map(async (node) => {
    const outs = node.data?.outputs;
    if (!outs || typeof outs !== "object") return node;
    const newOuts = {};
    for (const [k, v] of Object.entries(outs)) {
      if (isBinaryRef(v)) {
        const blob = await getBlob(v.ref);
        if (blob && blob.bytes) {
          newOuts[k] = makeBinary(blob.bytes, v.type || blob.type || "BIN");
        } else {
          // Ref dangling (blob deleted/missing); fall back to empty binary.
          newOuts[k] = makeBinary(new Uint8Array(0), v.type || "BIN");
        }
      } else {
        newOuts[k] = v;
      }
    }
    return { ...node, data: { ...node.data, outputs: newOuts } };
  }));
  return { ...flow, nodes };
}

// Used by the workflow-file export path. Drops binary bytes entirely and
// leaves a tiny placeholder so the workflow structure stays portable. Inlining
// hundreds of MB of binary into a JSON file is rarely what the user wants and
// the bytes would be unverifiable on another machine anyway.
export function stripBinaryForExport(flow) {
  let strippedAny = false;
  const nodes = (flow.nodes || []).map(node => {
    const outs = node.data?.outputs;
    if (!outs || typeof outs !== "object") return node;
    const newOuts = {};
    for (const [k, v] of Object.entries(outs)) {
      if (isDataValue(v) && v.kind === "binary") {
        strippedAny = true;
        newOuts[k] = { kind: "binary-stripped", type: v.type || "BIN", note: "binary content removed for export" };
      } else if (isBinaryRef(v)) {
        strippedAny = true;
        newOuts[k] = { kind: "binary-stripped", type: v.type || "BIN", note: "binary content removed for export" };
      } else {
        newOuts[k] = v;
      }
    }
    return { ...node, data: { ...node.data, outputs: newOuts } };
  });
  return { flow: { ...flow, nodes }, strippedAny };
}

// GC: drop IndexedDB blobs whose ids aren't referenced by any node in the
// currently-loaded flow. Call after every save.
export async function gcOrphans(flow) {
  const refs = [];
  for (const node of (flow.nodes || [])) {
    const outs = node.data?.outputs;
    if (!outs) continue;
    for (const v of Object.values(outs)) {
      if (isBinaryRef(v)) refs.push(v.ref);
    }
  }
  await gcBlobs(refs);
}
