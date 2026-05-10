import React, { memo, useEffect, useState } from 'react';

import { Box } from '@mui/material';

import { Handle, Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { OneConnectionHandle } from './OneConnectionHandle';

import { getTool } from '../../utils/toolUtils';
import { detectDataType } from '../../utils/detectDataType';

import ToolMessageIcons from '../ToolMessageIcons';

export const WorkflowNode = memo(({ id, data }) => {
  const { label, paramValues, outputs, repo } = data;

  const { updateNodeData } = useReactFlow();

  const toolData = getTool(label)
  const { inputs: toolInputs = [], outputs: toolOutputs = [] } = toolData.io ?? {};

  const [invalidOutputType, setInvalidOutputType] = useState(false);
  const [missingRequiredParameters, setMissingRequiredParameters] = useState(false)

  // init
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
    if (!repo) {
      updateNodeData(id, { repo: toolData.repo });
    }
  }, []);

  // check if required parameters are not filled in
  useEffect(() => {
    const missingRequiredParameters = toolData.parameters?.some(param =>
      param.required && param.type != "flag" && !paramValues?.[param.name]?.value
    );

    const toolMessages = {
      ...(data.toolMessages ?? {}),
      Parameter: {
        ...(data.toolMessages?.Parameter ?? {}),
        error: [],
      },
    };

    if (missingRequiredParameters) {
      toolMessages["Parameter"].error = ["Missing Required Parameters"]
    }

    updateNodeData(id, { canRun: !missingRequiredParameters, toolMessages })
  }, [paramValues]);

  // check if the output is not of an expected type
  useEffect(() => {
    const toolMessages = {
      ...(data.toolMessages ?? {}),
      Parameter: {
        ...(data.toolMessages?.Parameter ?? {}),
        info: [],
      },
    };

    for (const outputName in outputs) {
      const definedTypes = toolData.io.outputs.find(o => o.name === outputName).types
      const detectedType = detectDataType(data.outputs[outputName], definedTypes)
      const isInvalidOutputType = !definedTypes.includes(detectedType)

      if (isInvalidOutputType){
        toolMessages["Parameter"].info.push(`Output "${outputName}" is of an unexpected type "${detectedType}"`)
      }
    }

    updateNodeData(id, {toolMessages})
  }, [outputs]);

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
      <Box display="flex" alignItems="center" justifyContent="center">
        <label>{label}</label>
      </Box>

      <Box display="flex" alignItems="center" justifyContent="center">
        <ToolMessageIcons
          messages={data.toolMessages}
          size={12}
          pulseEnabled={false}
          sx={{ ml: 0.25, height: 12 }}
        />
      </Box>

      {/* Render input and output handles */}
      {renderInputHandles()}
      {renderOutputHandles()}
    </div>
  )
})
