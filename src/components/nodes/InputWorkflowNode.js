import React, { memo, useState } from 'react';
import { Position, Handle, useReactFlow } from '@xyflow/react';

export const InputWorkflowNode = memo(({ id, data }) => {
  const { updateNodeData } = useReactFlow();

  const [isEditing, setIsEditing] = useState(false); // Track whether the label is being edited
  const [label, setLabel] = useState(data.label); // Track the new label value

  const finishEditing = () => {
    setIsEditing(false);
    updateNodeData(id, { label });
  };

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

      <Handle id="out" type="source" position={Position.Bottom} style={{ left: '50%' }} />
    </div >
  );
});