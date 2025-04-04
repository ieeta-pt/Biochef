import { Box, Container, Grid, Typography } from '@mui/material';
import React, { useState } from 'react';
import { loadWasmModule } from '../gtoWasm';
import AllOperationsPanel from '/src/components/AllOperationsPanel';
import ToolInputPanel from '/src/components/ToolInputPanel';
import ToolOutputPanel from '/src/components/ToolOutputPanel';
import ToolTestingPanel from '/src/components/ToolTestingPanel';

const ToolsPage = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [helpMessage, setHelpMessage] = useState('');
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');

    const handleToolClick = async (tool) => {
        setSelectedTool(tool); // Update the selected tool

        try {
            const runFunction = await loadWasmModule(tool.name);
            const outputData = await runFunction('', ['-h']);

            if (outputData.stderr) {
                console.error('Error loading tool:', outputData.stderr);
            } else {
                setHelpMessage(outputData.stdout);
            }
        } catch (error) {
            console.error('Error loading tool:', error);
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 64px)',
                overflowY: 'auto',
            }}
        >
            <Container
                maxWidth="xl"
                sx={{
                    flex: 1,
                    py: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    height: '100%',
                }}
            >
                <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
                    {/* Tool Selection Panel */}
                    <Grid
                        item
                        xs={12}
                        md={3.2}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            maxHeight: '100%',
                        }}
                    >
                        <AllOperationsPanel onToolClick={handleToolClick} />
                    </Grid>

                    {/* Testing Tool Panel */}
                    <Grid
                        item
                        xs={12}
                        md={5.8}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto', // Independent scrolling
                            maxHeight: '100%',
                        }}
                    >
                        {selectedTool ? (
                            <ToolTestingPanel tool={selectedTool} inputData={inputData} setOutputData={setOutputData} />
                        ) : (
                            <Typography align="center" variant="h6" sx={{ marginTop: '20%' }}>
                                Select a tool from the list to view details and test it
                            </Typography>
                        )
                        }
                    </Grid>

                    {/* Input and Output Panels */}
                    <Grid
                        item
                        xs={12}
                        md={3}
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto', // Independent scrolling
                            maxHeight: '100%', // Adjusts height relative to header/footer
                        }}
                    >
                        <Box
                            sx={{
                                flexGrow: 1,
                                mb: 2,
                                overflowY: 'auto', // Independent scrolling
                            }}
                        >
                            <ToolInputPanel tool={selectedTool} inputData={inputData} setInputData={setInputData} />
                        </Box>
                        <Box
                            sx={{
                                flexGrow: 1,
                                overflowY: 'auto', // Independent scrolling
                            }}
                        >
                            <ToolOutputPanel outputData={outputData} setOutputData={setOutputData} tool={selectedTool} inputData={inputData} page={'ToolPage'} />
                        </Box>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default ToolsPage;
