// Build the multipart payload sent to the remote agent.
//
// The POST body has two kinds of fields:
//   biochef_workflow  - JSON description of the workflow graph
//   files[]           - actual file contents, one per InputWorkflowNode output
//
// Inside biochef_workflow, each input-node DataValue is replaced with a small
// file-ref marker so the agent can match files in the multipart body back to
// where they belong:
//
//   { kind: "file-ref", file: "<filename>", type: "BAM" }

import { isDataValue } from "./dataValue";
import { typeToExtensionMap } from "./getExtensionDataType";

const MIME_BY_TYPE = {
  BAM:  "application/x-bam",
  BCF:  "application/x-bcf",
  CRAM: "application/x-cram",
  BIN:  "application/octet-stream",
};

export function mimeForType(type) {
  return MIME_BY_TYPE[type] || "text/plain";
}

function filenameFor(nodeId, handle, type) {
  // Pick the extension from the declared type so the agent (and any tools
  // running there) can recognise the format. The previous convention used
  // .txt for everything which broke binary handling.
  const ext = typeToExtensionMap[type] || ".txt";
  return `${nodeId}-${handle}${ext}`;
}

// Build the multipart payload + the workflow JSON. Returns:
//   { workflowJSON: string, files: Array<File> }
// Caller appends each File under "files" and the JSON under "biochef_workflow".
export function prepareWorkflowForAgent(flow) {
  const files = [];
  const nodes = (flow.nodes || []).map(node => {
    if (node.type !== "inputWorkflowNode") return node;
    const outs = node.data?.outputs;
    if (!outs || typeof outs !== "object") return node;

    const newOuts = {};
    for (const [handle, raw] of Object.entries(outs)) {
      const value = raw;

      if (isDataValue(value) && value.kind === "binary") {
        const filename = filenameFor(node.id, handle, value.type || "BIN");
        const bytes = value.data instanceof Uint8Array ? value.data : new Uint8Array(0);
        files.push(new File([bytes], filename, { type: mimeForType(value.type) }));
        newOuts[handle] = { kind: "file-ref", file: filename, type: value.type || "BIN" };
      } else if (isDataValue(value) && value.kind === "text") {
        // Text inputs go through the file slot too so tools running on the
        // agent can read them as files just like binary inputs.
        const filename = filenameFor(node.id, handle, value.type || "TEXT");
        files.push(new File([value.data ?? ""], filename, { type: mimeForType(value.type) }));
        newOuts[handle] = { kind: "file-ref", file: filename, type: value.type || "TEXT" };
      } else if (typeof value === "string") {
        // Bare string from older code paths; same handling as a text DV.
        const filename = filenameFor(node.id, handle, "TEXT");
        files.push(new File([value], filename, { type: "text/plain" }));
        newOuts[handle] = { kind: "file-ref", file: filename, type: "TEXT" };
      } else {
        // Anything else (stale binary-ref/binary-stripped, undefined, ...) is
        // missing data. Send null so the agent can detect it instead of
        // guessing what it is.
        newOuts[handle] = null;
      }
    }
    return { ...node, data: { ...node.data, outputs: newOuts } };
  });
  return { workflowJSON: JSON.stringify({ ...flow, nodes }), files };
}
