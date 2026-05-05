import React, { memo, useEffect, useState } from 'react';
import { Position, useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';
import { OneConnectionHandle } from './OneConnectionHandle';
import { detectDataType } from '../../utils/detectDataType';
import { isDataValue } from '../../utils/dataValue';

export const OutputWorkflowNode = memo(({ id, data }) => {
  const { updateNodeData } = useReactFlow();

  const [isEditing, setIsEditing] = useState(false); // Track whether the label is being edited
  const [label, setLabel] = useState(data.label); // Track the new label value

  const finishEditing = () => {
    setIsEditing(false);
    updateNodeData(id, { label });
  };

  const connections = useNodeConnections({ handleType: 'target' });
  const sourceHandle = connections?.[0]?.sourceHandle;
  const connectionData = useNodesData(connections?.[0]?.source);

  useEffect(() => {
    if (!connectionData) return;
    const raw = connectionData.data.outputs?.[sourceHandle];
    // Existing consumers expect a primitive string. Unwrap text DataValues so
    // they keep working; pass binary DataValues through so the renderer can
    // tell what kind of payload it has and switch to a download UI.
    let output;
    if (isDataValue(raw)) {
      output = raw.kind === "text" ? (raw.data ?? "") : raw;
    } else {
      output = raw ?? "";
    }
    updateNodeData(id, { output });
  }, [connectionData]);

  return (
    <div className="react-flow__node-default">
      {isEditing ? (
        <input
          type="text"
          value={label}
          onChange={(e) => { setLabel(e.target.value); }}
          onBlur={finishEditing}
          onKeyUp={(e) => {
            if (e.key === 'Enter') {
              finishEditing();
            }
          }}
          style={{
            textAlign: 'center',
            width: '100%',
            padding: '5px',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        />
      ) : (
        <label onDoubleClick={() => { setIsEditing(true) }}>
          {label}
        </label>
      )}
      <OneConnectionHandle type="target" position={Position.Top} style={{ left: '50%' }} />
    </div>
  );
})
