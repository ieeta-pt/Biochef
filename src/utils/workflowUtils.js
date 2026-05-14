import { getTool } from "./toolUtils";
import { detectAllDataTypes } from "./detectDataType";
import { isTypeBinary } from "./typeDefinitions";

export function sanitizeWorkflowNodes(nodes) {
  return nodes.map(node => {

    const newData = {
      ...node.data,
      outputs: {}, 
      output: {},
      toolMessages: {},
      is_running: false,
      runCalled: false
    };

    if (node.type === "inputWorkflowNode") {
      for (const [key, value] of Object.entries(node.data.outputs || {})) {
        if (value?.kind == "text") {
          newData.outputs[key] = value;
        }
      }
    }

    return {
      ...node,
      data: newData
    };
  });
}

export function isValidConnection(sourceTypes, targetTypes) {
  let _sourceTypes = [...sourceTypes];

  // here we add TEXT as a sourceType if any of the current sourceTypes are not binary
  // this is so that we can have tools like GREP only have the TEXT type and still work
  for (const type of _sourceTypes) {
    if (!_sourceTypes.includes("TEXT") && !isTypeBinary(type)) {
      _sourceTypes.push("TEXT")
      break
    }
  }

  return _sourceTypes.some((type) =>
    targetTypes.includes(type)
  );
}

export function isValidWorkflowConnection(sourceNode, sourceHandle, targetNode, targetHandle) {
  if (!sourceNode || !targetNode) return false;

  if (targetNode.type == "outputWorkflowNode") return true;

  let sourceTypes = null;
  if (sourceNode.type == "inputWorkflowNode"){
    sourceTypes = detectAllDataTypes(sourceNode.data.outputs?.["out"])
  }
  else if (sourceNode.type === "workflowNode") {
    const toolConfig = getTool(sourceNode.data.label);
    sourceTypes = toolConfig.io.outputs.find((n) => n.name === sourceHandle).types;
  }
  if (!sourceTypes) return false

  let targetTypes = null;
  if (targetNode.type === "workflowNode") {
    const toolConfig = getTool(targetNode.data.label);
    targetTypes = toolConfig.io.inputs.find((n) => n.name === targetHandle).types;
  }
  if (!targetTypes) return false

  return isValidConnection(sourceTypes, targetTypes)
};

export function getNodeHandles(node) {
  if (node.type == "inputWorkflowNode") {
    return [
      [],
      ["out"]
    ]
  }
  else if (node.type == "outputWorkflowNode") {
    return [
      [undefined],
      []
    ]
  }
  else if (node.type == "workflowNode") {
    const toolData = getTool(node.data.label)
    const { inputs: toolInputs = [], outputs: toolOutputs = [] } = toolData.io ?? {};

    return [
      toolInputs.map((input, idx) => input.name),
      toolOutputs.map((output, idx) => output.name)
    ]
  }
}