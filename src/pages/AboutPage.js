import { Box, Container, Grid, Typography, Divider, Link, List, ListItem, ListItemText } from '@mui/material';
import React from 'react';

const AboutPage = () => {
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
                maxWidth="lg"
                sx={{
                    flex: 1,
                    py: 3,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <Grid container spacing={4}>
                    {/* Header */}
                    <Grid item xs={12}>
                        <Typography variant="h4" gutterBottom>
                            About BioChef
                        </Typography>
                        <Typography variant="body1" color="text.secondary">
                            BioChef is a browser-based platform designed to democratize access to bioinformatics tools, making genomic data analysis more accessible to researchers without deep computational expertise. By leveraging WebAssembly (WASM), BioChef allows complex C-based genomic tools to run directly in a browser, ensuring data privacy and eliminating the need for installation or command-line expertise.
                            <br /><br />
                            The platform aims to bridge the gap between biologists, healthcare professionals, and computational tools, improving the efficiency and autonomy of genomics research workflows.
                        </Typography>
                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            Contributors
                        </Typography>

                        <List dense>
                            <ListItem>
                                <ListItemText primary="José Luis Oliveira - Project Supervisor" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="Jorge Miguel Silva - Project Supervisor" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="Joaquim Rosa - Main Developer" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="João Andrade - Contributor" />
                            </ListItem>
                        </List>

                    </Grid>

                    <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            Credits
                        </Typography>

                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <>
                                            GTO Toolkit:{' '}
                                            <Link href="https://github.com/ieeta-pt/gto" target="_blank" rel="noopener">
                                                Github
                                            </Link>
                                        </>
                                    }
                                />
                            </ListItem>
                        </List>
                    </Grid>

                    {/* License & Resources */}
                    <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            License & Resources
                        </Typography>

                        <Typography variant="body1" paragraph>
                            BioChef is released under the <strong>MIT License</strong>.
                        </Typography>

                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <>
                                            GitHub Repository:{' '}
                                            <Link href="https://github.com/ieeta-pt/Biochef" target="_blank" rel="noopener">
                                                Biochef Github
                                            </Link>
                                        </>
                                    }
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary={
                                        <>
                                            Scientific Paper:{' '}
                                            <Link href="https://doi.org/10.21203/rs.3.rs-7697498/v1" target="_blank" rel="noopener">
                                                Paper
                                            </Link>
                                        </>
                                    }
                                />
                            </ListItem>
                        </List>
                    </Grid>

                    {/* Version History */}
                    <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            Version History
                        </Typography>

                        <List dense>
                            <ListItem>
                                <ListItemText
                                    primary="v1.0.0"
                                    secondary="Initial release of BioChef"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="v1.1.0"
                                    secondary="Introduced an 'About' page and implemented interactive tours for the Tools and Workflows pages."
                                />
                            </ListItem>
                        </List>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};


export default AboutPage;
