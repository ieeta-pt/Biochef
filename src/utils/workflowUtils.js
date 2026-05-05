import { getTool } from "./toolUtils";
import { detectAllDataTypes } from "./detectDataType";

export function sanitizeWorkflowNodes(nodes) {
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      output: {},
      outputs: node.type == "inputWorkflowNode" ? node.data.outputs : {},
      outputTypes: node.type == "inputWorkflowNode" ? node.data.outputTypes : {},
      is_running: false,
      runCalled: false
    },
  }));
}

export function isValidWorkflowConnection(sourceNode, sourceHandle, targetNode, targetHandle) {
  if (!sourceNode || !targetNode) return false;

  if (targetNode.type == "outputWorkflowNode") return true;

  let sourceTypes = null;
  if (sourceNode.type == "inputWorkflowNode"){
    sourceTypes = detectAllDataTypes(sourceNode.data.outputs["out"])
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

  return sourceTypes.some((type) =>
    targetTypes.includes(type)
  );
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