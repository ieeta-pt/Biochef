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
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla vulputate elit odio, eu fringilla nunc efficitur ac. Praesent molestie pharetra ante nec egestas. In hac habitasse platea dictumst. Proin semper hendrerit fringilla. In hac habitasse platea dictumst. Donec sed egestas sem, pulvinar ullamcorper quam. Donec leo purus, commodo ut sapien vitae, aliquam ultricies nibh. Vivamus efficitur metus nibh, ut faucibus purus hendrerit sed.
                        </Typography>
                    </Grid>

                    {/* Credits / Contributors */}
                    <Grid item xs={12}>
                        <Divider sx={{ mb: 2 }} />
                        <Typography variant="h5" gutterBottom>
                            Credits & Contributors
                        </Typography>
                        {/* <Typography variant="body1" paragraph>
                            BioChef is developed and maintained by researchers and engineers from:
                        </Typography> */}

                        <List dense>
                            <ListItem>
                                <ListItemText primary="Lorem ipsum" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="Lorem ipsum" />
                            </ListItem>
                            <ListItem>
                                <ListItemText primary="Lorem ipsum" />
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
                                    primary="vX.X.X"
                                    secondary="Lorem ipsum"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="vX.X.X"
                                    secondary="Lorem ipsum"
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemText
                                    primary="vX.X.X"
                                    secondary="Lorem ipsum"
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
