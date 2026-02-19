import React, { useCallback } from 'react'

import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, BackgroundVariant, MarkerType, Panel } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Paper } from '@mui/material'

import { WorkflowNode } from './nodes/WorkflowNode'
import { OutputWorkflowNode } from './nodes/OutputWorkflowNode'

const RecipePanel = ({ nodes, setNodes, edges, setEdges, handleNodeClicked }) => {
  const onNodesChange = useCallback((changes) => {
    setNodes((prev) => applyNodeChanges(changes, prev))
  })

  const onEdgesChange = useCallback((changes) => {
    setEdges((prev) => applyEdgeChanges(changes, prev))
  })

  const edgeOptions = {
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
  }

  const onConnect = useCallback((params) => {
    setEdges((prev) => addEdge({ ...params, ...edgeOptions }, prev))
  })

  const addSpecialNode = useCallback((type) => {
    const id = `${type}-${Date.now()}`; // unique ID
    const newNode = {
      id,
      type: type === 'input' ? 'input' : 'outputWorkflowNode', // match your nodeTypes
      data: {
        label: type === 'input' ? `Input` : `Output`,
        output: ''
      },
      position: { x: 0, y: 0 }, // put input above, output below
    };

    setNodes((prevNodes) => [...prevNodes, newNode]);
  });
  
  const nodeTypes = {
    workflowNode: WorkflowNode,
    outputWorkflowNode: OutputWorkflowNode,
  };

  const onNodeClick = useCallback((event, node) => {
    handleNodeClicked(node.id);
  });

  return (
    <Paper elevation={3} sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background bgColor="#FFFFFF" color='#009688' variant={BackgroundVariant.Dots} />

        <Panel>
          <button className="xy-theme__button" onClick={() => addSpecialNode('input')}>
            Add Input Node
          </button>
          <button className="xy-theme__button" onClick={() => addSpecialNode('output')}>
            Add Output Node
          </button>
        </Panel>

      </ReactFlow>

    </Paper>
  )
};

export default RecipePanel;
