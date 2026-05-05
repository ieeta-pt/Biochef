import React, { useEffect, useState } from 'react';
import { BaseEdge, getBezierPath, useNodesData, useReactFlow } from '@xyflow/react';
import { isValidWorkflowConnection } from '../../utils/workflowUtils';
import { getEdgeColor } from '../../utils/typeDefinitions';
import { getTool } from '../../utils/toolUtils';

export function WorkflowEdge(props) {
  const {
    id,
    label,
    source, sourceHandleId, sourcePosition, sourceX, sourceY,
    target, targetHandleId, targetPosition, targetX, targetY
  } = props;

  const { getNode, updateNodeData } = useReactFlow();
  const sourceHandleData = useNodesData(source);

  const [edgeColor, setEdgeColor] = useState("#999");
  const [edgeLabel, setEdgeLabel] = useState(label);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  useEffect(() => {
    const sourceNode = getNode(source);
    const targetNode = getNode(target);

    if (!sourceNode || !targetNode) return;

    const isValidConnection = isValidWorkflowConnection(
      sourceNode,
      sourceHandleId,
      targetNode,
      targetHandleId
    );

    const inputValidity = { ...(targetNode.data.inputValidity || {}) };
    inputValidity[targetHandleId] = isValidConnection;
    // updateNodeData(target, { inputValidity });

    const sourceTypes = sourceHandleData.data.outputTypes?.[sourceHandleId];
    let matchingTypes = []
    if (targetNode.type == "workflowNode") {
      const targetTypes = getTool(targetNode.data.label)
        .io.inputs
        .find(i => i.name == targetHandleId)
        ?.types || [];

      matchingTypes = sourceTypes.filter(type =>
        targetTypes.includes(type)
      );
    }
    else {
      matchingTypes = sourceTypes
    }

    if (!Array.isArray(matchingTypes)) matchingTypes = [matchingTypes]

    const selectedColor = getEdgeColor(matchingTypes?.[0]);
    const nextColor = isValidConnection ? selectedColor : "#ff0000";
    const nextLabel = isValidConnection
      ? (matchingTypes ? matchingTypes.join(", ") : label)
      : "❌";

    setEdgeColor(nextColor);
    setEdgeLabel(nextLabel);

  }, [
    target,
    sourceHandleData.data.outputTypes,
  ]);

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
                stroke: edgeColor,
                fill: edgeColor,
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
        style={{
          stroke: edgeColor,
          strokeDasharray: edgeLabel === "❌" ? '0' : '4,2',
          strokeWidth: edgeLabel === "❌" ? 2 : 1
        }}
        label={edgeLabel}
        labelX={labelX}
        labelY={labelY}
        labelStyle={{ fill: edgeColor, fontSize: 9 }}
      />

      <circle
        r="2.5"
        fill={edgeColor}
        style={{ opacity: sourceHandleData?.data?.is_running ? 1 : 0 }}
      >
        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}