import React from 'react';
import { BaseEdge, getBezierPath, getSmoothStepPath } from '@xyflow/react';

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd
}) {

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{
        strokeDasharray: '4,4',
      }} />

      <circle r="2" fill="#009688">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>

      <circle r="2" fill="#009688" visibility="hidden">
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="1s"
        />
        <animate attributeName="visibility" values="hidden;visible" begin="1s" dur="0.001s" fill="freeze" />
      </circle>
    </>
  );
}
