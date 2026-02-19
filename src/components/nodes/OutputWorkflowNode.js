import React, { memo, useEffect } from 'react';
import { Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { OneConnectionHandle } from './OneConnectionHandle';

export const OutputWorkflowNode = memo(({ id, data }) => {
  const { updateNodeData } = useReactFlow();

  const connections = useNodeConnections({ handleType: 'target' });
  const sourceHandle = connections?.[0]?.sourceHandle;
  const connectionData = useNodesData(connections?.[0]?.source);

  useEffect(() => {
    var output = ""
    if (sourceHandle) {
      output = connectionData?.data?.outputs?.[sourceHandle];
    }
    else {
      output = connectionData?.data?.output;
    }
    if (output){
      updateNodeData(id, { output });
    }
    else {
      updateNodeData(id, { output: "" });
    }
  }, [connectionData]);

  return (
    <div className="react-flow__node-default">
      <label>{data.label}</label>
      <OneConnectionHandle type="target" position={Position.Top} style={{ left: '50%' }} />
    </div>
  );
})
