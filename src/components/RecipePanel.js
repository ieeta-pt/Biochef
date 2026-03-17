import React, { useEffect, useCallback, useImperativeHandle, forwardRef, useState } from 'react';
import { ReactFlow, useStoreApi, useReactFlow, useNodesState, useEdgesState, applyNodeChanges, applyEdgeChanges, addEdge, Background, BackgroundVariant, MarkerType, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Paper, Button, Box, CircularProgress } from '@mui/material';
import { WorkflowNode } from './nodes/WorkflowNode';
import { OutputWorkflowNode } from './nodes/OutputWorkflowNode';
import { InputWorkflowNode } from './nodes/InputWorkflowNode';
import { WorkflowEdge } from './nodes/WorkflowEdge';
import { loadTool, getTool } from '../utils/toolUtils';
import { isValidWorkflowConnection, sanitizeWorkflowNodes } from '../utils/workflowUtils';

const RecipePanel = forwardRef(({ selectedNode, handleNodeClicked }, ref) => {
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  const nodeWidth = 150
  const nodeHeight = 40

  const store = useStoreApi()
  const { updateNodeData, screenToFlowPosition, getNode, setViewport, toObject } = useReactFlow();

  const [workflowLoaded, setWorkflowLoaded] = useState(false);

  useEffect(() => {
    const fetchWorkflow = async () => {
      const flow = JSON.parse(localStorage.getItem("workflow"));

      if (flow) {
        const { nodes: savedNodes = [], edges: savedEdges = [], viewport = {} } = flow;

        for (const node of savedNodes) {
          if (node.type === 'workflowNode') {
            await loadTool(node.data.label);
          }
        }

        setNodes(savedNodes);
        setEdges(savedEdges);

        const { x = 0, y = 0, zoom = 1 } = viewport;
        setViewport({ x, y, zoom });
      }

      setWorkflowLoaded(true);
    };

    fetchWorkflow()
  }, [])

  // TODO(andrade)
  // Make this more reasonable then just storing at every change.
  // Running this every change is doomed to give performance issues.
  useEffect(() => {
    if (!workflowLoaded) return;

    const flow = toObject();
    flow.nodes = sanitizeWorkflowNodes(flow.nodes)

    localStorage.setItem('workflow', JSON.stringify(flow));
  }, [nodes, edges]);

  useEffect(() => {
    if (!selectedNode) return;
    const node = nodes.find((n) => n.id === selectedNode.id);
    if (JSON.stringify(node.data) !== JSON.stringify(selectedNode.data)) {
      updateNodeData(selectedNode.id, selectedNode.data);
    }
  }, [selectedNode?.data]);

  const onNodesChange = useCallback((changes) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  }, []);

  const onEdgesChange = useCallback((changes) => {
    setEdges((prev) => applyEdgeChanges(changes, prev));
  }, []);

  const onConnect = useCallback((params) => {
    setEdges((prev) =>
      addEdge(
        {
          ...params,
          type: 'workflowEdge',
        },
        prev
      )
    );
  }, [setEdges]);

  const onNodeClick = useCallback((event, node) => {
    handleNodeClicked(node);
  });

  const getCenterPosition = () => {
    const { domNode } = store.getState()
    const boundingRect = domNode?.getBoundingClientRect()

    return screenToFlowPosition({
      x: boundingRect.x + boundingRect.width / 2,
      y: boundingRect.y + boundingRect.height / 2,
    })
  }

  const addWorkflowNode = (tool) => {
    const uniqueId = `${tool.id}-${Date.now()}`;
    const center = getCenterPosition()
    setNodes(prevNodes => {
      const newNode = {
        id: uniqueId,
        type: 'workflowNode',
        data: { label: tool.name, output: "", outputs: {} },
        position: {
          x: center.x - nodeWidth / 2,
          y: center.y - nodeHeight / 2,
        },
      };

      return [...prevNodes, newNode];
    });
  }

  const addInputNode = () => {
    const center = getCenterPosition()
    setNodes(prevNodes => {
      const newNode = {
        id: `input-${Date.now()}`,
        type: 'inputWorkflowNode',
        data: { label: "Input" },
        position: {
          x: center.x - nodeWidth / 2,
          y: center.y - nodeHeight / 2,
        },
      };

      return [...prevNodes, newNode];
    });
  };

  const addOutputNode = () => {
    const center = getCenterPosition()
    setNodes(prevNodes => {
      const newNode = {
        id: `output-${Date.now()}`,
        type: 'outputWorkflowNode',
        data: { label: "Output" },
        position: {
          x: center.x - nodeWidth / 2,
          y: center.y - nodeHeight / 2,
        },
      };

      return [...prevNodes, newNode];
    });
  };

  const clearWorkflow = () => {
    setNodes([]);
    setEdges([]);
  };

  const exportWorkflow = useCallback(() => {
    if (nodes.length === 0) return;

    const flow = toObject();
    flow.nodes = sanitizeWorkflowNodes(flow.nodes);
    const fileContent = JSON.stringify(flow, null, 2);

    const blob = new Blob([fileContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow.json`;
    a.click();

    URL.revokeObjectURL(url);
  }, [nodes, toObject]);

  // Import Workflow function
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
  }, [setNodes, setEdges, setViewport]);

  useImperativeHandle(ref, () => ({
    addWorkflowNode,
  }));

  const resetViewportPosition = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  }

  const WorkflowButton = ({ children, ...props }) => (
    <Button
      variant='outlined'
      sx={{
        borderColor: 'lightgray',
        color: 'darkslategrey',
        background: 'rgba(255, 255, 255, 1)',
        '&:hover': {
          borderColor: 'lightgray',
          background: 'rgba(240, 240, 240, 1)',
        },
        margin: 0.5
      }}
      disableElevation
      {...props}
    >
      {children}
    </Button>
  );

  const isValidConnection = (connection) => {
    const { source, sourceHandle, target, targetHandle } = connection;
    return isValidWorkflowConnection(getNode(source), sourceHandle, getNode(target), targetHandle)
  };

  if (!workflowLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 64px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={{
          workflowNode: WorkflowNode,
          outputWorkflowNode: OutputWorkflowNode,
          inputWorkflowNode: InputWorkflowNode
        }}
        edgeTypes={{
          workflowEdge: WorkflowEdge,
        }}
        isValidConnection={isValidConnection}
        fitView
      >
        <Background bgColor="#FFFFFF" color='#009688' variant={BackgroundVariant.Dots} />

        <Panel>
          <WorkflowButton onClick={addInputNode}>
            Add Input Node
          </WorkflowButton>
          <WorkflowButton onClick={addOutputNode}>
            Add Output Node
          </WorkflowButton>
          <WorkflowButton onClick={importWorkflow}>
            Import Workflow
          </WorkflowButton>
          <WorkflowButton onClick={exportWorkflow}>
            Export Workflow
          </WorkflowButton>
          <WorkflowButton onClick={clearWorkflow}>
            Clear Workflow
          </WorkflowButton>
          <WorkflowButton onClick={resetViewportPosition}>
            Recenter
          </WorkflowButton>
        </Panel>

      </ReactFlow>
    </Paper>
  );
});

export default RecipePanel;