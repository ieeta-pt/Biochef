import { getTool } from "./toolUtils";

export function sanitizeWorkflowNodes(nodes)
{
  return nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      output: {},
      outputs: node.type == "inputWorkflowNode" ? node.data.outputs : {} ,
      outputTypes: node.type == "inputWorkflowNode" ? node.data.outputTypes : {} ,
      is_running: false,
      runCalled: false
    },
  }));
}

export function isValidWorkflowConnection(sourceNode, sourceHandle, targetNode, targetHandle)
{
  if (!sourceNode || !targetNode) return false;
  
  if (targetNode.type == "outputWorkflowNode") return true;

  let sourceTypes = null;
  if (sourceNode.type == "inputWorkflowNode"){
    sourceTypes = [sourceNode.data.outputTypes?.[sourceHandle]];
  }
  else if (sourceNode.type === "workflowNode") {
    const toolConfig = getTool(sourceNode.data.label);
    console.log(toolConfig)
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