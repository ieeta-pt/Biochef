import React, { memo, useEffect } from 'react';

import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { OneConnectionHandle } from './OneConnectionHandle';

import { runTool, getTool } from '../../utils/toolUtils';

export const WorkflowNode = memo(({ id, data }) => {
  const { label, paramValues } = data;
  const { updateNodeData } = useReactFlow();

  const toolData = getTool(label) // TODO: use ID instead of tool name
  const { inputs: toolInputs = [], outputs: toolOutputs = [] } = toolData.io ?? {};

  const inputConnections = useNodeConnections({ handleType: 'target' });
  const inputConnectionsData = useNodesData(inputConnections.map(conn => conn.source));

  useEffect(() => {
    if (!paramValues) {
      const initialParamValues = {};

      toolData.parameters?.forEach(param => {
        initialParamValues[param.name] = {
          enabled: param.required,
          value: param.default !== undefined ? param.default : '',
        };
      });

      updateNodeData(id, { paramValues: initialParamValues });
    }
  }, []);

  useEffect(() => {
    async function handleRunTool() {
      // Merge each input connection with its corresponding source node
      const connections = inputConnections.map(conn => ({
        ...conn,
        sourceNode: inputConnectionsData?.find(n => n.id === conn.source)
      }));

      if (!connections.length) return;

      const inputs = {};
      connections.forEach(({ sourceNode, sourceHandle, targetHandle }) => {
        if (sourceHandle) {
          inputs[targetHandle] = sourceNode.data.outputs[sourceHandle];
        }
        else {
          inputs[targetHandle] = sourceNode.data.output
        }
      });

      const args = [];
      toolData.parameters.forEach(param => {
        const enabled = paramValues[param.name].enabled;
        if (!enabled) return;

        const value = paramValues[param.name].value;

        if (param.type === 'flag') {
          args.push(param.flag);
        }
        else if (value !== '' && value !== undefined) {
          param.flag ? args.push(param.flag, value) : args.push(value);
        }
      });

      const {outputs, error} = await runTool(toolData.name, inputs, args, {});
      updateNodeData(id, { outputs });
    }

    handleRunTool();
  }, [inputConnectionsData, paramValues]);

  function renderInputHandles() {
    return toolInputs.map((input, idx) => (
      <div
        key={input.name}
        style={{
          position: 'absolute',
          top: 0,
          left: `${((idx + 1) / (toolInputs.length + 1)) * 100}%`,
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}
      >
        {toolInputs.length > 1 && <div style={{ marginTop: 2, fontSize: 8 }}>{input.name}</div>}
        <OneConnectionHandle id={input.name} type="target" position={Position.Top} />
      </div>
    ));
  }

  function renderOutputHandles() {
    return toolOutputs.map((output, idx) => (
      <div
        key={output.name}
        style={{
          position: 'absolute',
          bottom: 0,
          left: `${((idx + 1) / (toolOutputs.length + 1)) * 100}%`,
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}
      >
        <Handle id={output.name} type="source" position={Position.Bottom} />
        {toolOutputs.length > 1 && <div style={{ marginBottom: 2, fontSize: 8 }}>{output.name}</div>}
      </div>
    ));
  }

  return (
    <div className="react-flow__node-default">
      <label>{label}</label>
      {renderInputHandles()}
      {renderOutputHandles()}
    </div>
  );
})