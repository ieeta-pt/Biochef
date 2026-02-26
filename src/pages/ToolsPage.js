import { Box, Container, Grid, Typography, Button, Drawer } from '@mui/material';
import React, { useState, useContext, useEffect } from 'react';
import { loadWasmModule } from '../gtoWasm';
import AllOperationsPanel from '/src/components/AllOperationsPanel';
import ToolInputPanel from '/src/components/ToolInputPanel';
import ToolOutputPanel from '/src/components/ToolOutputPanel';
import ToolTestingPanel from '/src/components/ToolTestingPanel';
import { TourContext } from '../contexts/TourContext';

const ToolsPage = () => {
    const [selectedTool, setSelectedTool] = useState(null);
    const [helpMessage, setHelpMessage] = useState('');
    const [inputData, setInputData] = useState('');
    const [outputData, setOutputData] = useState('');
    const { tourStart, tourRegisterSteps, tourMoveNext, tourIsActive } = useContext(TourContext);
    const [openHelp, setOpenHelp] = useState(false);

    const runToolsTour = () => {
        tourStart(["t-intro", "t-tools", "t-input", "t-testing"]);
        localStorage.setItem("toolsPageTourCompleted", "true");
    };

    useEffect(() => {
        tourRegisterSteps("t-intro", [
            {
                popover: {
                    title: "Welcome to the Tools Page",
                    description: "This page provides an interactive environment for exploring and running tools directly in the browser. Users can select a tool, configure inputs, execute it, and inspect outputs.<br /><br />The following tour briefly highlights the main components of the interface and how they are used together.<br /><br />You can re-run this tour at any time using the button on the top right.",
                },
            },
        ]);
        if (!localStorage.getItem("toolsPageTourCompleted")) {
            runToolsTour();
        }
    }, []);

    const handleRerunTour = () => {
        localStorage.removeItem("toolsPageTourCompleted");
        localStorage.removeItem("toolsPageSecondTourCompleted");
        runToolsTour();
    };

    const handleToolClick = async (tool) => {
        setSelectedTool(tool); // Update the selected tool
        if (tourIsActive) tourMoveNext();

        try {
            const startTime = performance.now();
            const runFunction = await loadWasmModule(tool.name);
            const loadTime = performance.now() - startTime;
            console.log(`Module ${tool.name} loaded in ${loadTime.toFixed(2)}ms`);
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
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setOpenHelp(true)}
                    sx={{
                        position: 'fixed',
                        top: 80,
                        right: 16,
                        zIndex: 1200,
                    }}
                >
                    Re-run Tour
                </Button>
                <Drawer
                    anchor="right"
                    open={openHelp}
                    onClose={() => setOpenHelp(false)}
                >
                    <Box sx={{ width: 320, p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Guided Tour
                        </Typography>

                        <Typography variant="body2" sx={{ mb: 2 }}>
                            This tour will show you how to:<br />
                            • Browse and select available tools<br />
                            • Configure tool inputs<br />
                            • Execute and test tools in the browser<br />
                            • Inspect outputs and results<br /><br />
                            Starting the tour will guide you through the main interface and highlight key components.<br /><br />
                            You can re-run this tour anytime using the button below.
                        </Typography>

                        <Button
                            variant="contained"
                            fullWidth
                            onClick={() => {
                                setOpenHelp(false);
                                handleRerunTour();
                            }}
                        >
                            Start Tour
                        </Button>
                    </Box>
                </Drawer>

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
