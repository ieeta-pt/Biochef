import React, { useEffect, useState } from 'react';
import { BaseEdge, getBezierPath, useNodesData, useReactFlow } from '@xyflow/react';
import { isValidWorkflowConnection } from '../../utils/workflowUtils';
import { getDefaultEdgeColor, getEdgeColor } from '../../utils/typeDefinitions';
import { getTool, getToolInputByName, getToolOutputByName } from '../../utils/toolUtils';
import { detectAllDataTypes } from '../../utils/detectDataType';

export function WorkflowEdge(props) {
  const {
    id,
    label,
    source, sourceHandleId, sourcePosition, sourceX, sourceY,
    target, targetHandleId, targetPosition, targetX, targetY
  } = props;

  const { getNode } = useReactFlow();
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

    if (!isValidConnection) {
      setEdgeColor("#ff0000")
      setEdgeLabel("❌")
      return
    }

    const sourceNodeOutput = sourceHandleData.data.outputs?.[sourceHandleId];
    if (sourceNodeOutput == undefined) {
      setEdgeColor(getDefaultEdgeColor())
      setEdgeLabel("")
      return
    }

    const sourceNodeDetectedOutputTypes = detectAllDataTypes(sourceNodeOutput)

    // if it's an output node the matching types is just all the source node types
    let matchingTypes = []
    if (targetNode.type == "workflowNode") {
      const targetNodeInputTypes = getToolInputByName(targetNode.data.label, targetHandleId)

      matchingTypes = sourceNodeDetectedOutputTypes.filter(type =>
        targetNodeInputTypes.includes(type)
      );
    }
    else {
      const sourceNodeOutputTypes = getToolOutputByName(sourceNode.data.label, sourceHandleId)

      matchingTypes = sourceNodeOutputTypes.filter(type =>
        sourceNodeDetectedOutputTypes.includes(type)
      );
    }

    // NOTE(andrade) this should never happen BUT 
    // we have checks in the WorkflowNode to check if the output is not of the expected type, 
    // and having those check show a warning is better than throwing an error
    //
    // if (matchingTypes.length == 0) {
    //   throw `connection between "${sourceNode.data.label}-${sourceHandleId}" and "${targetNode.data.label}-${targetHandleId}" somehow has now matching types`
    // }

    setEdgeColor(getEdgeColor(matchingTypes[0]));
    setEdgeLabel(matchingTypes.join(", "));
  }, [
    sourceHandleData.data.outputs,
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
        style={{ opacity: sourceHandleData?.data?.isRunning ? 1 : 0 }}
      >
        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}