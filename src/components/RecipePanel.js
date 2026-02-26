import React, { useCallback } from 'react'

import { ReactFlow, useReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, Background, BackgroundVariant, MarkerType, Panel } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Paper } from '@mui/material'

import { WorkflowNode } from './nodes/WorkflowNode'
import { OutputWorkflowNode } from './nodes/OutputWorkflowNode'
import { loadTool } from '../utils/toolUtils'
import { sanitizeWorkflowNodes } from '../utils/workflowUtils'

const RecipePanel = ({ nodes, setNodes, edges, setEdges, handleNodeClicked }) => {
  const { toObject, setViewport } = useReactFlow();
  
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

  const onNodeClick = useCallback((event, node) => {
    handleNodeClicked(node.id);
  });

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
  
  const clearWorkflow = useCallback(() => {
    setNodes([])
    setEdges([])
  })

  const exportWorkflow = useCallback(() => {
    if (nodes.length == 0) return;

    const flow = toObject()
    flow.nodes = sanitizeWorkflowNodes(flow.nodes)
    const fileContent = JSON.stringify(flow, null, 2);

    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow.json`;
    a.click();

    URL.revokeObjectURL(url);
  })

  const importWorkflow = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const flow = JSON.parse(text);

        const { nodes: importedNodes = [], edges: importedEdges = [], viewport = {} } = flow;

        for (const node of importedNodes) {
          if (node.type === 'workflowNode') {
            await loadTool(node.data.label); // TODO check if exists
          }
        }

        setNodes(importedNodes);
        setEdges(importedEdges);

        if (viewport && typeof viewport === 'object') {
          const { x = 0, y = 0, zoom = 1 } = viewport;
          setViewport({ x, y, zoom });
        }

      } catch (err) {
        console.error("Failed to import workflow:", err);
        alert("Invalid JSON file.");
      }
    };

    input.click();
  }, []);

  const nodeTypes = {
    workflowNode: WorkflowNode,
    outputWorkflowNode: OutputWorkflowNode,
  };

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
          <button onClick={() => addSpecialNode('input')}>
            Add Input Node
          </button>
          <button onClick={() => addSpecialNode('output')}>
            Add Output Node
          </button>
          <button onClick={() => clearWorkflow()}>
            Clear Workflow
          </button>
          <button onClick={() => importWorkflow()}>
            Import Workflow
          </button>
          <button onClick={() => exportWorkflow()}>
            Export Workflow
          </button>
        </Panel>

      </ReactFlow>

    </Paper>
  )
};

export default RecipePanel;
