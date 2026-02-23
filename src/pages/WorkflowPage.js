import {
  Box,
  Container,
  Grid,
  CircularProgress,
  Typography,
  Paper
} from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { getTool } from '../utils/toolUtils';
import InputPanel from '../components/InputPanel';
import ErrorBoundary from '/src/components/ErrorBoundary'; // Ensure this component exists
import OperationsPanel from '/src/components/OperationsPanel';
import RecipePanel from '/src/components/RecipePanel';
import { DataTypeContext } from '/src/contexts/DataTypeContext';
import { loadToolIndex, loadTool } from '../utils/toolUtils';
import ToolParameterSection from '../components/ToolParameterSection';
import ToolOutputPanel from '../components/ToolOutputPanel'

import {
  useReactFlow,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

const WorkflowPage = () => {
  const [toolIndexLoaded, setToolIndexLoaded] = useState(false);
  const [inputTabIndex, setInputTabIndex] = useState({})
  const [selectedFileManagerFiles, setSelectedFileManagerFiles] = useState({});
  const [inputFileManagerTree, setInputFileManagerTree] = useState({});

  const getInitialTree = () => ({
    id: 'root',
    name: 'Root',
    type: 'folder',
    children: [],
  });

  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const { updateNodeData } = useReactFlow();

  const [selectedNode, setSelectedNode] = useState(null);

  // load tool index on opening the page
  useEffect(() => {
    const fetchTools = async () => {
      await loadToolIndex();
      setToolIndexLoaded(true);
    };

    fetchTools();
  }, []);

  const handleNodeClicked = useCallback((id) => {
    const node = nodes.find(n => n.id === id);
    setSelectedNode(node);
  }, [nodes]);

  const handleAddOperation = async (toolName) => {
    await loadTool(toolName)
    const tool = getTool(toolName)

    const uniqueId = `${tool.id}-${Date.now()}`;
    setNodes(prevNodes => {
      const newNode = {
        id: uniqueId,
        type: 'workflowNode',
        data: { label: toolName, output: "", outputs: {} },
        position: { x: 0, y: 0 },
      };

      return [...prevNodes, newNode];
    });
  };

  const updateSelectedNodeData = (newData) => {
    updateNodeData(selectedNode.id, newData)

    setSelectedNode((prevNode) => ({
      ...prevNode,
      data: {
        ...prevNode.data,
        ...newData,
      },
    }));
  };

  const handleUpdateSelectedInputNode = (text) => {
    updateSelectedNodeData({ output: text })
  };

  function handleToggleParam(name) {
    if (!selectedNode) return;

    const oldParam = selectedNode.data.paramValues?.[name] || {};

    const newParamValues = {
      ...selectedNode.data.paramValues,
      [name]: {
        ...oldParam,
        enabled: !oldParam.enabled,
      },
    };

    updateSelectedNodeData({ paramValues: newParamValues });
  }

  function handleChangeParam(name, value) {
    if (!selectedNode) return;

    const oldParam = selectedNode.data.paramValues?.[name] || {};

    const newParamValues = {
      ...selectedNode.data.paramValues,
      [name]: {
        enabled: oldParam.enabled ?? true,
        value: value,
      },
    };

    updateSelectedNodeData({ paramValues: newParamValues });
  }

  if (!toolIndexLoaded) {
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
    <ErrorBoundary>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)',
        }}
      >
        {/* Main Content */}
        <Container
          maxWidth="false"
          sx={{
            flex: 1,
            py: 2,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden', // Prevents overflow beyond the container
          }}
        >
          <Grid container spacing={2} sx={{ flex: 1, height: '100%', overflow: 'hidden' }}>
            {/* Operations Panel */}
            <Grid
              item
              xs={12}
              md={2.6}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1, // Allow it to take available space without stretching
                overflowY: 'auto', // Enable independent scrolling
                height: '100%', // Ensure it does not overflow parent
              }}
            >

              <OperationsPanel
                onAddOperation={handleAddOperation}
                // isWorkflowEmpty={isWorkflowEmpty}
                // isLoading={isLoading}
                setIsLoading={() => { return }}
                // insertAtIndex={insertAtIndex}
                // setInsertAtIndex={setInsertAtIndex}
                // addingATool={addingATool}
                // setAddingATool={setAddingATool}
                filteredTools={[]}
              // setFilteredTools={setFilteredTools}
              // selectedFiles={selectedFiles}
              // tabIndex={0}
              // workflow={workflow}
              />
            </Grid>

            {/* Recipe/Workflow Panel */}
            <Grid
              item
              xs={12}
              md={6.8}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1, // Allow it to take available space without stretching
                overflowY: 'auto', // Enable independent scrolling
                height: '100%', // Ensure it does not overflow parent
              }}
            >
              {/* TODO: this is a temporary thing, make it better in the future */}

              <RecipePanel
                nodes={nodes}
                setNodes={setNodes}
                edges={edges}
                setEdges={setEdges}
                handleNodeClicked={handleNodeClicked}
              />
            </Grid>

            {/* Input and Output Panels */}
            <Grid
              item
              xs={12}
              md={2.6}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1, // Allow it to take available space without stretching
                overflowY: 'auto', // Enable independent scrolling
                height: '100%', // Ensure it does not overflow parent
              }}
            >
              {!selectedNode && (
                // <h1>nothing to do</h1>
                <></>
              )}

              {/* NOTE(andrade) 
                  I'm reusing the old panels instead of creating new ones
                  that is the reason for these horrendous looking wrappers.
                  These panels expect tree and selectedFiles to be useStates
                  but now we need different ones for each node.
                  It would probably be a good idea either to adapt the panels or
                  just make new ones altogether so this doesn't have to exist.
              */}
              {selectedNode && selectedNode.type === 'input' && (
                <InputPanel
                  tabIndex={inputTabIndex?.[selectedNode.id] ?? 0}
                  setTabIndex={(value) =>
                    setInputTabIndex(prev => ({
                      ...prev,
                      [selectedNode.id]: value
                    }))
                  }
                  selectedFiles={selectedFileManagerFiles?.[selectedNode.id] ?? new Set()}
                  setSelectedFiles={(updater) =>
                    setSelectedFileManagerFiles(prev => {
                      const currentFiles = prev[selectedNode.id] || new Set()
                      const newFiles = typeof updater === "function" ? updater(currentFiles) : updater;
                      return {
                        ...prev,
                        [selectedNode.id]: newFiles,
                      };
                    })
                  }
                  inputData={selectedNode.data.output}
                  setInputData={handleUpdateSelectedInputNode}
                  tree={inputFileManagerTree?.[selectedNode.id] ?? getInitialTree()}
                  setTree={(updater) =>
                    setInputFileManagerTree(prev => {
                      const currentTree = prev[selectedNode.id] || {}
                      const newTree = typeof updater === "function" ? updater(currentTree) : updater;
                      return {
                        ...prev,
                        [selectedNode.id]: newTree,
                      };
                    })
                  }
                />
              )}

              {selectedNode && selectedNode.type === 'workflowNode' && (
                <Paper
                  elevation={3}
                  sx={{ padding: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    <Typography variant="h6" gutterBottom>
                      {selectedNode.data.label}
                    </Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                    <Paper
                      elevation={0}
                      sx={{
                        transition: 'transform 150ms ease, background-color 300ms ease, border-color 300ms ease',
                        marginBottom: '8px',
                        padding: '8px',
                        borderRadius: '4px',
                        cursor: 'grab',
                        backgroundColor: 'white',
                      }}
                    >
                      <ToolParameterSection
                        toolConfig={getTool(selectedNode.data.label)}
                        parameters={selectedNode.data.paramValues}
                        validationErrors={{}}
                        // helpMessages={helpMessages?.flags}
                        handleParameterChange={handleChangeParam}
                        toggleParameter={handleToggleParam}
                      />
                    </Paper>
                  </Box>
                </Paper>
              )}

              {selectedNode && selectedNode.type === 'outputWorkflowNode' && (
                <ToolOutputPanel
                  outputData={selectedNode.data.output}
                  // setOutputData={setOutputData} 
                  // tool={selectedTool} 
                  // inputData={inputData} 
                  // page={'ToolPage'} 
                  rows={25}
                />
              )}

            </Grid>
          </Grid>
        </Container>
      </Box>
    </ErrorBoundary>
  );
};

export default WorkflowPage;