import React, { memo, useEffect, useState } from 'react';

import { Tooltip } from '@mui/material';

import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { OneConnectionHandle } from './OneConnectionHandle';

import { runTool, getTool } from '../../utils/toolUtils';
import { detectDataType } from '../../utils/detectDataType';

export const WorkflowNode = memo(({ id, data }) => {
  const { label, paramValues, repo } = data;


  const { updateNodeData, getNode } = useReactFlow();

  const toolData = getTool(label) // TODO: use ID instead of tool name
  const { inputs: toolInputs = [], outputs: toolOutputs = [] } = toolData.io ?? {};

  useEffect(() => {
    if (!repo && toolData?.repo) {
      updateNodeData(id, { repo: toolData.repo });
    }
  }, [repo, toolData?.repo, id, updateNodeData]);

  const inputConnections = useNodeConnections({ handleType: 'target' });
  const inputConnectionsData = useNodesData(inputConnections.map(conn => conn.source));

  const outputConnections = useNodeConnections({ handleType: 'source' });
  const outputsConnected = outputConnections.map(output => output.sourceHandle);

  const [invalidOutputType, setInvalidOutputType] = useState(false);
  // TODO: check parameters before running because of agent
  const [invalidParameters, setInvalidParameters] = useState(false)

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

  async function handleRunTool() {
    const inputValidity = data.inputValidity || {};
    const hasInvalidInputs = Object.values(inputValidity).some(v => v === false);
    if (hasInvalidInputs) {
      updateNodeData(id, { outputs: {}, outputTypes: {} })
      return;
    }

    // Merge each input connection with its corresponding source node
    const connections = inputConnections.map(conn => ({
      ...conn,
      sourceNode: inputConnectionsData?.find(n => n.id === conn.source)
    }));

    if (!connections.length) return;

    const inputs = {};
    connections.forEach(({ sourceNode, sourceHandle, targetHandle }) => {
      inputs[targetHandle] = sourceNode.data.outputs[sourceHandle];
    });

    const allInputsEmpty = Object.values(inputs).every(value =>
      value === "" || value === undefined || value === null
    );

    // this is to prevent the tools from running right after loading from localstorage
    if (allInputsEmpty && Object.keys(data.outputs).length === 0) return;

    const missingRequiredParameters = toolData.parameters?.some(param =>
      param.required && param.type != "flag" && (paramValues[param.name]?.value === "" || paramValues[param.name]?.value === undefined || paramValues[param.name]?.value === null)
    );

    setInvalidParameters(missingRequiredParameters)
    if (missingRequiredParameters) {
      updateNodeData(id, { outputs: {}, outputTypes: {} })
      return
    };

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

    updateNodeData(id, { is_running: true, outputTypes: {} });
    const { outputs, error } = await runTool(toolData.name, inputs, args, {}, outputsConnected);

    updateNodeData(id, { outputs, is_running: false, runCalled: false });
  }

  useEffect(() => {
    if (data.runCalled && !data.is_running) {
      updateNodeData(id, { runCalled: false })
      handleRunTool()
    }
  }, [data]);

  useEffect(() => {
    if (!inputConnections.every(conn => getNode(conn.source).type === "inputWorkflowNode")) {
      handleRunTool();
    }
  }, [data.inputValidity, paramValues, inputConnections]);

  useEffect(() => {
    const outputTypes = {};
    for (const key in data.outputs) {
      if (!outputsConnected.includes(key)) continue;
      const definedTypes = toolData.io.outputs.find(o => o.name === key).types
      const detectedType = detectDataType(data.outputs[key], definedTypes)
      setInvalidOutputType(!definedTypes.includes(detectedType))

      outputTypes[key] = detectedType;
    }
    updateNodeData(id, { outputTypes })
  }, [data.outputs]);

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

    <div className="react-flow__node-default" style={{ position: 'relative' }}>
      <label>{label}</label>

      {(invalidParameters || invalidOutputType) && (
        <Tooltip
          title={invalidParameters ? 'Invalid Parameters' : 'Invalid Output Type'}
          placement="top-end"
          arrow
        >
          <div
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: invalidParameters ? 'red' : 'yellow',
              border: '2px solid #fff',
            }}
          />
        </Tooltip>

      )}

      {/* Render input and output handles */}
      {renderInputHandles()}
      {renderOutputHandles()}
    </div>
  )
})
