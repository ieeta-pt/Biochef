import React from 'react';
import { BaseEdge, getBezierPath, useNodesData } from '@xyflow/react';
import { getTool } from '../../utils/toolUtils';
import { detectDataType } from '../../utils/detectDataType';
import { output } from 'framer-motion/client';
export function WorkflowEdge(props) {

  const {
    animated,
    data,
    deletable,
    id,
    interactionWidth,
    label,
    labelBgBorderRadius,
    labelBgPadding,
    labelBgStyle,
    labelShowBg,
    labelStyle,
    markerEnd,
    markerStart,
    pathOptions,
    selectable,
    selected,
    source,
    sourceHandleId,
    sourcePosition,
    sourceX,
    sourceY,
    style,
    target,
    targetHandleId,
    targetPosition,
    targetX,
    targetY,
    type,
  } = props

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const sourceHandleData = useNodesData(source);
  var handleType = null;

  const isWorkflowNode = sourceHandleData?.type == 'workflowNode'
  if (sourceHandleData?.type == 'workflowNode' && sourceHandleData?.data.outputs[sourceHandleId]) {
    const toolName = sourceHandleData?.data.label
    const toolConfig = toolName && isWorkflowNode ? getTool(toolName) : null;
    const outputTypes = toolConfig ? toolConfig.io.outputs.find((output) => output.name === sourceHandleId).types : [];

    if (outputTypes.length > 1) {
      const detectedType = detectDataType('input.txt', sourceHandleData?.data.outputs[sourceHandleId]);
      handleType = detectedType;
    }
    else if (outputTypes.length == 1) {
      handleType = outputTypes[0];
    }
  }
  else if (sourceHandleData?.type == 'inputWorkflowNode' && sourceHandleData?.data.output) {
    const detectedType = detectDataType('input.txt', sourceHandleData?.data.output);
    handleType = detectedType;
  }

  const typeColors = {
    "FASTA": "#e74c3c",  // bright red
    "NUM": "#3498db",    // blue
    "TEXT": "#2ecc71",   // green
    "DNA": "#9b59b6"     // purple
  };
  const selectedColor = handleType && typeColors.hasOwnProperty(handleType)
    ? typeColors[handleType]
    : null;

  const markerId = `marker-${id}`;
  return (
    <>
      <svg style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <marker
            className="react-flow__arrowhead"
            id={markerId}
            markerWidth="20"
            markerHeight="20"
            viewBox="-10 -10 20 20"
            markerUnits="userSpaceOnUse"
            orient="auto-start-reverse"
            refX="0"
            refY="0"
          >
            <polyline
              className="arrowclosed"
              style={{
                strokeWidth: 1,
                stroke: selectedColor,
                fill: selectedColor,
              }}
              strokeLinecap="round"
              strokeLinejoin="round"
              points="-5,-4 0,0 -5,4 -5,-4"
            />
          </marker>
        </defs>
      </svg>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{ stroke: selectedColor, strokeDasharray: '4,2' }}
        label={handleType && handleType != "UNKNOWN" ? handleType : label}
        labelX={labelX}
        labelY={labelY}
        labelStyle={{ fill: selectedColor, fontSize: 9 }}
      />

      <circle
        r="2.5"
        fill={selectedColor}
        style={{ opacity: sourceHandleData?.data.is_running ? 1 : 0 }}
      >
        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
