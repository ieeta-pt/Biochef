import { getTool } from "./toolUtils";

export function sanitizeWorkflowNodes(nodes)
{
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      output: "",
      outputs: {},
      outputTypes: {},
      is_running: false
    },
  }));
}

export function isValidWorkflowConnection(sourceNode, sourceHandle, targetNode, targetHandle)
{
  if (!sourceNode || !targetNode) return false;
  
  if (targetNode.type == "outputWorkflowNode") return true;

  var sourceTypes = [sourceNode.data.outputTypes?.[sourceHandle]];
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