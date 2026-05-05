import React, { useEffect, useState } from 'react';
import { BaseEdge, getBezierPath, useNodesData, useReactFlow } from '@xyflow/react';
import { isValidWorkflowConnection } from '../../utils/workflowUtils';

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

  const typeColors = {
    FASTA: "#e74c3c",
    "Multi-FASTA": "#d35400",
    FASTQ: "#e67e22",
    DNA: "#9b59b6",
    RNA: "#8e44ad",
    AminoAcids: "#16a085",
    NUM: "#3498db",
    PackagedFASTQ: "#2c3e50",
    TEXT: "#2ecc71",
    BIN: "#123456",
    // Binary HTS formats
    BAM: "#5d4037",
    BCF: "#6d4c41",
    CRAM: "#795548",
    SAM: "#8d6e63",
    // Tabular bio formats
    VCF: "#7e57c2",
    BED: "#26a69a",
    GFF: "#00897b",
  };

  useEffect(() => {
    const sourceNode = getNode(source);
    const targetNode = getNode(target);

    if (!sourceNode || !targetNode) return;

    const handleType = sourceHandleData.data.outputTypes?.[sourceHandleId];

    const isValidConnection = isValidWorkflowConnection(
      sourceNode,
      sourceHandleId,
      targetNode,
      targetHandleId
    );

    const inputValidity = { ...(targetNode.data.inputValidity || {}) };
    inputValidity[targetHandleId] = isValidConnection;
    updateNodeData(target, { inputValidity });

    // compute colors here
    const selectedColor =
      handleType && typeColors.hasOwnProperty(handleType)
        ? typeColors[handleType]
        : "#999";

    const nextColor = isValidConnection ? selectedColor : "#ff0000";
    const nextLabel = isValidConnection
      ? (handleType && handleType !== "UNKNOWN" ? handleType : label)
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